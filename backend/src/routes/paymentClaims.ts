import { Request, Response, Router } from "express";
import { PaymentClaimStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { describePaymentClaimUpdate, logActivity } from "../activityLog";

const STATUSES = ["SUBMITTED", "CERTIFIED", "DISPUTED", "PAID"];
const CERTIFIED_IMPLYING_STATUSES = ["CERTIFIED", "PAID"];

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value as string) : null;
}

function parseRequiredDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

// A claim can only be linked to a Contracts register entry belonging to
// the same project, otherwise "remaining contract value" math would leak
// across projects.
async function resolveContractId(
  contractId: unknown,
  projectId: string
): Promise<string | null | undefined> {
  if (contractId === undefined) return undefined;
  if (contractId === null || contractId === "") return null;
  if (typeof contractId !== "string") return null;
  const contract = await prisma.contractRecord.findUnique({ where: { id: contractId } });
  if (!contract || contract.projectId !== projectId) return null;
  return contract.id;
}

const projectPaymentClaimsRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectPaymentClaimsRouter.get("/", async (req: Request<ProjectParams>, res: Response) => {
  const claims = await prisma.paymentClaim.findMany({
    where: { projectId: req.params.id },
    orderBy: { dateSubmitted: "desc" },
  });
  res.json(claims);
});

projectPaymentClaimsRouter.post("/", async (req: Request<ProjectParams>, res: Response) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const {
    claimNumber,
    periodEnding,
    claimedAmount,
    certifiedAmount,
    status,
    dateSubmitted,
    notes,
    trimLink,
    contractId,
  } = req.body as Record<string, unknown>;

  if (typeof claimNumber !== "string" || !claimNumber.trim()) {
    return res.status(400).json({ error: "Claim number is required" });
  }
  const parsedClaimedAmount = Number(claimedAmount);
  if (claimedAmount === undefined || claimedAmount === null || Number.isNaN(parsedClaimedAmount)) {
    return res.status(400).json({ error: "A valid claimed amount is required" });
  }
  const parsedDateSubmitted = parseRequiredDate(dateSubmitted);
  if (!parsedDateSubmitted) {
    return res.status(400).json({ error: "A valid date submitted is required" });
  }
  if (status !== undefined && !STATUSES.includes(status as string)) {
    return res
      .status(400)
      .json({ error: "status must be SUBMITTED, CERTIFIED, DISPUTED or PAID" });
  }

  const resolvedStatus = (status as PaymentClaimStatus) ?? "SUBMITTED";
  const certifies = CERTIFIED_IMPLYING_STATUSES.includes(resolvedStatus);
  const resolvedContractId = await resolveContractId(contractId, req.params.id);

  const claim = await prisma.paymentClaim.create({
    data: {
      projectId: req.params.id,
      claimNumber: claimNumber.trim(),
      periodEnding: parseDate(periodEnding) ?? null,
      claimedAmount: parsedClaimedAmount,
      certifiedAmount: parseOptionalNumber(certifiedAmount) ?? null,
      status: resolvedStatus,
      dateSubmitted: parsedDateSubmitted,
      dateCertified: certifies ? new Date() : null,
      datePaid: resolvedStatus === "PAID" ? new Date() : null,
      raisedById: req.user!.sub,
      raisedByName: req.user!.name,
      notes: (notes as string) || null,
      trimLink: typeof trimLink === "string" && trimLink.trim() ? trimLink.trim() : null,
      contractId: resolvedContractId ?? null,
    },
  });

  await logActivity({
    projectId: project.id,
    projectName: project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `submitted payment claim "${claim.claimNumber}"`,
  });

  res.status(201).json(claim);
});

export const paymentClaimsRouter = Router();

// Every payment claim across every project, for the portfolio-wide
// dashboard panel — avoids one request per project.
paymentClaimsRouter.get("/", async (_req, res) => {
  const claims = await prisma.paymentClaim.findMany({
    orderBy: { dateSubmitted: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
  res.json(claims);
});

paymentClaimsRouter.put("/:id", async (req, res) => {
  const before = await prisma.paymentClaim.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Payment claim not found" });

  const {
    claimNumber,
    periodEnding,
    claimedAmount,
    certifiedAmount,
    status,
    dateSubmitted,
    notes,
    trimLink,
    contractId,
  } = req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (claimNumber !== undefined) {
    if (typeof claimNumber !== "string" || !claimNumber.trim()) {
      return res.status(400).json({ error: "Claim number is required" });
    }
    data.claimNumber = claimNumber.trim();
  }
  const period = parseDate(periodEnding);
  if (period !== undefined) data.periodEnding = period;
  if (claimedAmount !== undefined) {
    const parsed = Number(claimedAmount);
    if (Number.isNaN(parsed)) {
      return res.status(400).json({ error: "A valid claimed amount is required" });
    }
    data.claimedAmount = parsed;
  }
  if (certifiedAmount !== undefined) data.certifiedAmount = parseOptionalNumber(certifiedAmount);
  if (contractId !== undefined) {
    data.contractId = await resolveContractId(contractId, before.projectId);
  }
  const submitted = parseDate(dateSubmitted);
  if (submitted !== undefined) data.dateSubmitted = submitted ?? before.dateSubmitted;
  if (notes !== undefined) data.notes = notes || null;
  if (trimLink !== undefined) {
    data.trimLink = typeof trimLink === "string" && trimLink.trim() ? trimLink.trim() : null;
  }
  if (status !== undefined) {
    if (!STATUSES.includes(status as string)) {
      return res
        .status(400)
        .json({ error: "status must be SUBMITTED, CERTIFIED, DISPUTED or PAID" });
    }
    data.status = status;
    if (status !== before.status) {
      const certifies = CERTIFIED_IMPLYING_STATUSES.includes(status as string);
      data.dateCertified = certifies ? before.dateCertified ?? new Date() : null;
      data.datePaid = status === "PAID" ? new Date() : null;
    }
  }

  try {
    const claim = await prisma.paymentClaim.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describePaymentClaimUpdate(before, data),
    });
    res.json(claim);
  } catch (err) {
    res.status(400).json({ error: "Unable to update payment claim" });
  }
});

paymentClaimsRouter.delete("/:id", async (req, res) => {
  const claim = await prisma.paymentClaim.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!claim) return res.status(404).json({ error: "Payment claim not found" });

  await logActivity({
    projectId: claim.project.id,
    projectName: claim.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted payment claim "${claim.claimNumber}"`,
  });
  await prisma.paymentClaim.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectPaymentClaimsRouter;
