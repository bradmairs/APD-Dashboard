import { Request, Response, Router } from "express";
import { SqeCategory, SqeSeverity, SqeStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { describeSqeUpdate, logActivity } from "../activityLog";

const CATEGORIES = ["SAFETY", "QUALITY", "ENVIRONMENT"];
const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUSES = ["OPEN", "IN_PROGRESS", "CLOSED"];

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value as string) : null;
}

function parseRequiredDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const projectSqeRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectSqeRouter.get("/", async (req: Request<ProjectParams>, res: Response) => {
  const records = await prisma.sqeRecord.findMany({
    where: { projectId: req.params.id },
    orderBy: { dateOccurred: "desc" },
  });
  res.json(records);
});

projectSqeRouter.post("/", async (req: Request<ProjectParams>, res: Response) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const {
    category,
    severity,
    title,
    description,
    correctiveAction,
    dateOccurred,
    status,
  } = req.body as Record<string, unknown>;

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }
  if (!CATEGORIES.includes(category as string)) {
    return res.status(400).json({ error: "category must be SAFETY, QUALITY or ENVIRONMENT" });
  }
  if (!SEVERITIES.includes(severity as string)) {
    return res.status(400).json({ error: "severity must be LOW, MEDIUM, HIGH or CRITICAL" });
  }
  const parsedDateOccurred = parseRequiredDate(dateOccurred);
  if (!parsedDateOccurred) {
    return res.status(400).json({ error: "A valid date occurred is required" });
  }
  if (status !== undefined && !STATUSES.includes(status as string)) {
    return res.status(400).json({ error: "status must be OPEN, IN_PROGRESS or CLOSED" });
  }

  const resolvedStatus = (status as SqeStatus) ?? "OPEN";

  const record = await prisma.sqeRecord.create({
    data: {
      projectId: req.params.id,
      category: category as SqeCategory,
      severity: severity as SqeSeverity,
      title: title.trim(),
      description: (description as string) || null,
      correctiveAction: (correctiveAction as string) || null,
      dateOccurred: parsedDateOccurred,
      status: resolvedStatus,
      dateClosed: resolvedStatus === "CLOSED" ? new Date() : null,
      reportedById: req.user!.sub,
      reportedByName: req.user!.name,
    },
  });

  await logActivity({
    projectId: project.id,
    projectName: project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `logged a ${record.category.toLowerCase()} issue "${record.title}"`,
  });

  res.status(201).json(record);
});

export const sqeRouter = Router();

// Every SQE record across every project, for the portfolio-wide Open
// SQE Issues panel on the dashboard — avoids one request per project.
sqeRouter.get("/", async (_req, res) => {
  const records = await prisma.sqeRecord.findMany({
    orderBy: { dateOccurred: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
  res.json(records);
});

sqeRouter.put("/:id", async (req, res) => {
  const before = await prisma.sqeRecord.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "SQE record not found" });

  const {
    category,
    severity,
    title,
    description,
    correctiveAction,
    dateOccurred,
    status,
  } = req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (category !== undefined) {
    if (!CATEGORIES.includes(category as string)) {
      return res.status(400).json({ error: "category must be SAFETY, QUALITY or ENVIRONMENT" });
    }
    data.category = category;
  }
  if (severity !== undefined) {
    if (!SEVERITIES.includes(severity as string)) {
      return res.status(400).json({ error: "severity must be LOW, MEDIUM, HIGH or CRITICAL" });
    }
    data.severity = severity;
  }
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    data.title = title.trim();
  }
  if (description !== undefined) data.description = description || null;
  if (correctiveAction !== undefined) data.correctiveAction = correctiveAction || null;
  const occurred = parseDate(dateOccurred);
  if (occurred !== undefined) data.dateOccurred = occurred ?? before.dateOccurred;
  if (status !== undefined) {
    if (!STATUSES.includes(status as string)) {
      return res.status(400).json({ error: "status must be OPEN, IN_PROGRESS or CLOSED" });
    }
    data.status = status;
    if (status !== before.status) {
      data.dateClosed = status === "CLOSED" ? new Date() : null;
    }
  }

  try {
    const record = await prisma.sqeRecord.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeSqeUpdate(before, data),
    });
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: "Unable to update SQE record" });
  }
});

sqeRouter.delete("/:id", async (req, res) => {
  const record = await prisma.sqeRecord.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!record) return res.status(404).json({ error: "SQE record not found" });

  await logActivity({
    projectId: record.project.id,
    projectName: record.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted the ${record.category.toLowerCase()} issue "${record.title}"`,
  });
  await prisma.sqeRecord.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectSqeRouter;
