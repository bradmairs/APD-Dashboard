import { Request, Response, Router } from "express";
import { InsuranceWarrantyType } from "@prisma/client";
import { prisma } from "../prisma";
import { describeInsuranceWarrantyUpdate, logActivity } from "../activityLog";

const TYPES = ["INSURANCE", "WARRANTY"];

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value as string) : null;
}

const projectInsuranceWarrantiesRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectInsuranceWarrantiesRouter.get(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const items = await prisma.insuranceWarranty.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  }
);

projectInsuranceWarrantiesRouter.post(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const {
      type,
      title,
      provider,
      referenceNumber,
      coverageDetails,
      startDate,
      expiryDate,
      notes,
    } = req.body as Record<string, unknown>;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (!TYPES.includes(type as string)) {
      return res.status(400).json({ error: "type must be INSURANCE or WARRANTY" });
    }

    const item = await prisma.insuranceWarranty.create({
      data: {
        projectId: req.params.id,
        type: type as InsuranceWarrantyType,
        title: title.trim(),
        provider: (provider as string) || null,
        referenceNumber: (referenceNumber as string) || null,
        coverageDetails: (coverageDetails as string) || null,
        startDate: startDate ? new Date(startDate as string) : null,
        expiryDate: expiryDate ? new Date(expiryDate as string) : null,
        notes: (notes as string) || null,
        createdById: req.user!.sub,
        createdByName: req.user!.name,
      },
    });

    await logActivity({
      projectId: project.id,
      projectName: project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: `added ${item.type === "WARRANTY" ? "warranty" : "insurance policy"} "${item.title}"`,
    });

    res.status(201).json(item);
  }
);

export const insuranceWarrantiesRouter = Router();

// Every insurance/warranty item across every project, for the
// portfolio-wide Expiring Soon panel on the dashboard — avoids one
// request per project.
insuranceWarrantiesRouter.get("/", async (_req, res) => {
  const items = await prisma.insuranceWarranty.findMany({
    orderBy: { createdAt: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
  res.json(items);
});

insuranceWarrantiesRouter.put("/:id", async (req, res) => {
  const before = await prisma.insuranceWarranty.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Insurance/warranty item not found" });

  const {
    type,
    title,
    provider,
    referenceNumber,
    coverageDetails,
    startDate,
    expiryDate,
    notes,
  } = req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (type !== undefined) {
    if (!TYPES.includes(type as string)) {
      return res.status(400).json({ error: "type must be INSURANCE or WARRANTY" });
    }
    data.type = type;
  }
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    data.title = title.trim();
  }
  if (provider !== undefined) data.provider = provider || null;
  if (referenceNumber !== undefined) data.referenceNumber = referenceNumber || null;
  if (coverageDetails !== undefined) data.coverageDetails = coverageDetails || null;
  const start = parseDate(startDate);
  if (start !== undefined) data.startDate = start;
  const expiry = parseDate(expiryDate);
  if (expiry !== undefined) data.expiryDate = expiry;
  if (notes !== undefined) data.notes = notes || null;

  try {
    const item = await prisma.insuranceWarranty.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeInsuranceWarrantyUpdate(before, data),
    });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: "Unable to update insurance/warranty item" });
  }
});

insuranceWarrantiesRouter.delete("/:id", async (req, res) => {
  const item = await prisma.insuranceWarranty.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!item) return res.status(404).json({ error: "Insurance/warranty item not found" });

  await logActivity({
    projectId: item.project.id,
    projectName: item.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted ${item.type === "WARRANTY" ? "warranty" : "insurance policy"} "${item.title}"`,
  });
  await prisma.insuranceWarranty.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectInsuranceWarrantiesRouter;
