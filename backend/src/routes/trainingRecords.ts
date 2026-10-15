import { Request, Response, Router } from "express";
import { prisma } from "../prisma";
import { describeTrainingRecordUpdate, logActivity } from "../activityLog";

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value as string) : null;
}

const projectTrainingRecordsRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectTrainingRecordsRouter.get("/", async (req: Request<ProjectParams>, res: Response) => {
  const records = await prisma.trainingRecord.findMany({
    where: { projectId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(records);
});

projectTrainingRecordsRouter.post("/", async (req: Request<ProjectParams>, res: Response) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const {
    personName,
    company,
    trainingType,
    completionDate,
    expiryDate,
    certificateNumber,
    notes,
  } = req.body as Record<string, unknown>;

  if (typeof personName !== "string" || !personName.trim()) {
    return res.status(400).json({ error: "Person name is required" });
  }
  if (typeof trainingType !== "string" || !trainingType.trim()) {
    return res.status(400).json({ error: "Training type is required" });
  }
  if (!completionDate) {
    return res.status(400).json({ error: "Completion date is required" });
  }

  const record = await prisma.trainingRecord.create({
    data: {
      projectId: req.params.id,
      personName: personName.trim(),
      company: (company as string) || null,
      trainingType: trainingType.trim(),
      completionDate: new Date(completionDate as string),
      expiryDate: parseDate(expiryDate) ?? null,
      certificateNumber: (certificateNumber as string) || null,
      notes: (notes as string) || null,
      recordedById: req.user!.sub,
      recordedByName: req.user!.name,
    },
  });

  await logActivity({
    projectId: project.id,
    projectName: project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `added training record "${record.trainingType}" for ${record.personName}`,
  });

  res.status(201).json(record);
});

export const trainingRecordsRouter = Router();

// Every training record across every project, for a portfolio-wide Expiring
// Training panel on the dashboard — avoids one request per project.
trainingRecordsRouter.get("/", async (_req, res) => {
  const records = await prisma.trainingRecord.findMany({
    orderBy: { createdAt: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
  res.json(records);
});

trainingRecordsRouter.put("/:id", async (req, res) => {
  const before = await prisma.trainingRecord.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Training record not found" });

  const {
    personName,
    company,
    trainingType,
    completionDate,
    expiryDate,
    certificateNumber,
    notes,
  } = req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (personName !== undefined) {
    if (typeof personName !== "string" || !personName.trim()) {
      return res.status(400).json({ error: "Person name is required" });
    }
    data.personName = personName.trim();
  }
  if (company !== undefined) data.company = company || null;
  if (trainingType !== undefined) {
    if (typeof trainingType !== "string" || !trainingType.trim()) {
      return res.status(400).json({ error: "Training type is required" });
    }
    data.trainingType = trainingType.trim();
  }
  if (completionDate !== undefined) data.completionDate = new Date(completionDate as string);
  const expiry = parseDate(expiryDate);
  if (expiry !== undefined) data.expiryDate = expiry;
  if (certificateNumber !== undefined) data.certificateNumber = certificateNumber || null;
  if (notes !== undefined) data.notes = notes || null;

  try {
    const record = await prisma.trainingRecord.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeTrainingRecordUpdate(before),
    });
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: "Unable to update training record" });
  }
});

trainingRecordsRouter.delete("/:id", async (req, res) => {
  const record = await prisma.trainingRecord.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!record) return res.status(404).json({ error: "Training record not found" });

  await logActivity({
    projectId: record.project.id,
    projectName: record.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted training record "${record.trainingType}" for ${record.personName}`,
  });
  await prisma.trainingRecord.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectTrainingRecordsRouter;
