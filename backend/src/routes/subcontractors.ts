import { Request, Response, Router } from "express";
import { SubcontractorStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { describeSubcontractorUpdate, logActivity } from "../activityLog";

const STATUSES = ["ENGAGED", "ACTIVE", "COMPLETED", "TERMINATED"];

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value as string) : null;
}

function parseContractValue(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

const projectSubcontractorsRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectSubcontractorsRouter.get("/", async (req: Request<ProjectParams>, res: Response) => {
  const subcontractors = await prisma.subcontractor.findMany({
    where: { projectId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(subcontractors);
});

projectSubcontractorsRouter.post("/", async (req: Request<ProjectParams>, res: Response) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const {
    companyName,
    trade,
    contactName,
    contactDetails,
    contractValue,
    startDate,
    endDate,
    status,
    insuranceExpiry,
    notes,
  } = req.body as Record<string, unknown>;

  if (typeof companyName !== "string" || !companyName.trim()) {
    return res.status(400).json({ error: "Company name is required" });
  }
  if (status !== undefined && !STATUSES.includes(status as string)) {
    return res.status(400).json({ error: "status must be ENGAGED, ACTIVE, COMPLETED or TERMINATED" });
  }

  const subcontractor = await prisma.subcontractor.create({
    data: {
      projectId: req.params.id,
      companyName: companyName.trim(),
      trade: (trade as string) || null,
      contactName: (contactName as string) || null,
      contactDetails: (contactDetails as string) || null,
      contractValue: parseContractValue(contractValue) ?? null,
      startDate: parseDate(startDate) ?? null,
      endDate: parseDate(endDate) ?? null,
      status: (status as SubcontractorStatus) ?? "ENGAGED",
      insuranceExpiry: parseDate(insuranceExpiry) ?? null,
      notes: (notes as string) || null,
      addedById: req.user!.sub,
      addedByName: req.user!.name,
    },
  });

  await logActivity({
    projectId: project.id,
    projectName: project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `added subcontractor "${subcontractor.companyName}"`,
  });

  res.status(201).json(subcontractor);
});

export const subcontractorsRouter = Router();

// Every subcontractor across every project, for a portfolio-wide Expiring
// Subcontractor Insurance panel on the dashboard — avoids one request per
// project.
subcontractorsRouter.get("/", async (_req, res) => {
  const subcontractors = await prisma.subcontractor.findMany({
    orderBy: { createdAt: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
  res.json(subcontractors);
});

subcontractorsRouter.put("/:id", async (req, res) => {
  const before = await prisma.subcontractor.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Subcontractor not found" });

  const {
    companyName,
    trade,
    contactName,
    contactDetails,
    contractValue,
    startDate,
    endDate,
    status,
    insuranceExpiry,
    notes,
  } = req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (companyName !== undefined) {
    if (typeof companyName !== "string" || !companyName.trim()) {
      return res.status(400).json({ error: "Company name is required" });
    }
    data.companyName = companyName.trim();
  }
  if (trade !== undefined) data.trade = trade || null;
  if (contactName !== undefined) data.contactName = contactName || null;
  if (contactDetails !== undefined) data.contactDetails = contactDetails || null;
  const value = parseContractValue(contractValue);
  if (value !== undefined) data.contractValue = value;
  const start = parseDate(startDate);
  if (start !== undefined) data.startDate = start;
  const end = parseDate(endDate);
  if (end !== undefined) data.endDate = end;
  const insurance = parseDate(insuranceExpiry);
  if (insurance !== undefined) data.insuranceExpiry = insurance;
  if (notes !== undefined) data.notes = notes || null;
  if (status !== undefined) {
    if (!STATUSES.includes(status as string)) {
      return res.status(400).json({ error: "status must be ENGAGED, ACTIVE, COMPLETED or TERMINATED" });
    }
    data.status = status;
  }

  try {
    const subcontractor = await prisma.subcontractor.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeSubcontractorUpdate(before, data),
    });
    res.json(subcontractor);
  } catch (err) {
    res.status(400).json({ error: "Unable to update subcontractor" });
  }
});

subcontractorsRouter.delete("/:id", async (req, res) => {
  const subcontractor = await prisma.subcontractor.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!subcontractor) return res.status(404).json({ error: "Subcontractor not found" });

  await logActivity({
    projectId: subcontractor.project.id,
    projectName: subcontractor.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted subcontractor "${subcontractor.companyName}"`,
  });
  await prisma.subcontractor.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectSubcontractorsRouter;
