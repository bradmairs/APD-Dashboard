import { Request, Response, Router } from "express";
import { ContractPartyType, ContractStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { describeContractUpdate, logActivity } from "../activityLog";

const PARTY_TYPES = ["CONSULTANT", "CONTRACTOR"];
const STATUSES = ["ACTIVE", "COMPLETE", "TERMINATED"];

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value as string) : null;
}

function parseNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseInteger(value: unknown): number | null | undefined {
  const parsed = parseNumber(value);
  if (parsed === undefined || parsed === null) return parsed;
  return Math.trunc(parsed);
}

const projectContractsRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectContractsRouter.get("/", async (req: Request<ProjectParams>, res: Response) => {
  const contracts = await prisma.contractRecord.findMany({
    where: { projectId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(contracts);
});

projectContractsRouter.post("/", async (req: Request<ProjectParams>, res: Response) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const {
    partyType,
    partyName,
    discipline,
    contractNumber,
    contractForm,
    contractValue,
    contingency,
    poNumber,
    provisionalItemsValue,
    retentionPercent,
    defectsLiabilityMonths,
    executionDate,
    startDate,
    completionDate,
    status,
    notes,
  } = req.body as Record<string, unknown>;

  if (typeof partyName !== "string" || !partyName.trim()) {
    return res.status(400).json({ error: "Party name is required" });
  }
  if (!PARTY_TYPES.includes(partyType as string)) {
    return res.status(400).json({ error: "partyType must be CONSULTANT or CONTRACTOR" });
  }
  if (status !== undefined && !STATUSES.includes(status as string)) {
    return res.status(400).json({ error: "status must be ACTIVE, COMPLETE or TERMINATED" });
  }

  const contract = await prisma.contractRecord.create({
    data: {
      projectId: req.params.id,
      partyType: partyType as ContractPartyType,
      partyName: partyName.trim(),
      discipline: (discipline as string) || null,
      contractNumber: (contractNumber as string) || null,
      contractForm: (contractForm as string) || null,
      contractValue: parseNumber(contractValue) ?? null,
      contingency: parseNumber(contingency) ?? null,
      poNumber: typeof poNumber === "string" && poNumber.trim() ? poNumber.trim() : null,
      provisionalItemsValue: parseNumber(provisionalItemsValue) ?? null,
      retentionPercent: parseNumber(retentionPercent) ?? null,
      defectsLiabilityMonths: parseInteger(defectsLiabilityMonths) ?? null,
      executionDate: parseDate(executionDate) ?? null,
      startDate: parseDate(startDate) ?? null,
      completionDate: parseDate(completionDate) ?? null,
      status: (status as ContractStatus) ?? "ACTIVE",
      notes: (notes as string) || null,
      addedById: req.user!.sub,
      addedByName: req.user!.name,
    },
  });

  const noun = contract.partyType === "CONSULTANT" ? "consultant contract" : "contractor contract";
  await logActivity({
    projectId: project.id,
    projectName: project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `added ${noun} "${contract.partyName}"`,
  });

  res.status(201).json(contract);
});

export const contractsRouter = Router();

contractsRouter.put("/:id", async (req, res) => {
  const before = await prisma.contractRecord.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Contract not found" });

  const {
    partyType,
    partyName,
    discipline,
    contractNumber,
    contractForm,
    contractValue,
    contingency,
    poNumber,
    provisionalItemsValue,
    retentionPercent,
    defectsLiabilityMonths,
    executionDate,
    startDate,
    completionDate,
    status,
    notes,
  } = req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (partyType !== undefined) {
    if (!PARTY_TYPES.includes(partyType as string)) {
      return res.status(400).json({ error: "partyType must be CONSULTANT or CONTRACTOR" });
    }
    data.partyType = partyType;
  }
  if (partyName !== undefined) {
    if (typeof partyName !== "string" || !partyName.trim()) {
      return res.status(400).json({ error: "Party name is required" });
    }
    data.partyName = partyName.trim();
  }
  if (discipline !== undefined) data.discipline = discipline || null;
  if (contractNumber !== undefined) data.contractNumber = contractNumber || null;
  if (contractForm !== undefined) data.contractForm = contractForm || null;
  const value = parseNumber(contractValue);
  if (value !== undefined) data.contractValue = value;
  const contingencyValue = parseNumber(contingency);
  if (contingencyValue !== undefined) data.contingency = contingencyValue;
  if (poNumber !== undefined) {
    data.poNumber = typeof poNumber === "string" && poNumber.trim() ? poNumber.trim() : null;
  }
  const provisionalItems = parseNumber(provisionalItemsValue);
  if (provisionalItems !== undefined) data.provisionalItemsValue = provisionalItems;
  const retention = parseNumber(retentionPercent);
  if (retention !== undefined) data.retentionPercent = retention;
  const dlp = parseInteger(defectsLiabilityMonths);
  if (dlp !== undefined) data.defectsLiabilityMonths = dlp;
  const execution = parseDate(executionDate);
  if (execution !== undefined) data.executionDate = execution;
  const start = parseDate(startDate);
  if (start !== undefined) data.startDate = start;
  const completion = parseDate(completionDate);
  if (completion !== undefined) data.completionDate = completion;
  if (notes !== undefined) data.notes = notes || null;
  if (status !== undefined) {
    if (!STATUSES.includes(status as string)) {
      return res.status(400).json({ error: "status must be ACTIVE, COMPLETE or TERMINATED" });
    }
    data.status = status;
  }

  try {
    const contract = await prisma.contractRecord.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeContractUpdate(before, data),
    });
    res.json(contract);
  } catch (err) {
    res.status(400).json({ error: "Unable to update contract" });
  }
});

contractsRouter.delete("/:id", async (req, res) => {
  const contract = await prisma.contractRecord.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!contract) return res.status(404).json({ error: "Contract not found" });

  const noun = contract.partyType === "CONSULTANT" ? "consultant contract" : "contractor contract";
  await logActivity({
    projectId: contract.project.id,
    projectName: contract.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted ${noun} "${contract.partyName}"`,
  });
  await prisma.contractRecord.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectContractsRouter;
