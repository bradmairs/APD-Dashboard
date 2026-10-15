import { Request, Response, Router } from "express";
import { DelayStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { describeDelayUpdate, logActivity } from "../activityLog";

const STATUSES = ["ONGOING", "RESOLVED"];

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value as string) : null;
}

function parseRequiredDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseIntOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : Math.trunc(n);
}

const projectDelaysRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectDelaysRouter.get("/", async (req: Request<ProjectParams>, res: Response) => {
  const delays = await prisma.delay.findMany({
    where: { projectId: req.params.id },
    orderBy: { dateStarted: "desc" },
  });
  res.json(delays);
});

projectDelaysRouter.post("/", async (req: Request<ProjectParams>, res: Response) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const {
    title,
    category,
    description,
    responsibleParty,
    criticalPath,
    dateStarted,
    dateEnded,
    daysImpact,
    status,
    mitigation,
    eotReference,
    notes,
  } = req.body as Record<string, unknown>;

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }
  const parsedStart = parseRequiredDate(dateStarted);
  if (!parsedStart) {
    return res.status(400).json({ error: "A valid start date is required" });
  }
  if (status !== undefined && !STATUSES.includes(status as string)) {
    return res.status(400).json({ error: "status must be ONGOING or RESOLVED" });
  }
  const parsedEnd = parseDate(dateEnded) ?? null;
  if (parsedEnd && parsedEnd < parsedStart) {
    return res.status(400).json({ error: "The end date cannot be before the start date" });
  }
  const resolvedStatus = (status as DelayStatus) ?? (parsedEnd ? "RESOLVED" : "ONGOING");

  const delay = await prisma.delay.create({
    data: {
      projectId: req.params.id,
      title: title.trim(),
      category: (category as string) || null,
      description: (description as string) || null,
      responsibleParty: (responsibleParty as string) || null,
      criticalPath: criticalPath === true,
      dateStarted: parsedStart,
      dateEnded: resolvedStatus === "RESOLVED" ? parsedEnd ?? new Date() : null,
      daysImpact: parseIntOrNull(daysImpact),
      status: resolvedStatus,
      mitigation: (mitigation as string) || null,
      eotReference: (eotReference as string) || null,
      notes: (notes as string) || null,
      raisedById: req.user!.sub,
      raisedByName: req.user!.name,
    },
  });

  await logActivity({
    projectId: project.id,
    projectName: project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `logged delay "${delay.title}"`,
  });

  res.status(201).json(delay);
});

export const delaysRouter = Router();

delaysRouter.put("/:id", async (req, res) => {
  const before = await prisma.delay.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Delay not found" });

  const {
    title,
    category,
    description,
    responsibleParty,
    criticalPath,
    dateStarted,
    dateEnded,
    daysImpact,
    status,
    mitigation,
    eotReference,
    notes,
  } = req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    data.title = title.trim();
  }
  if (category !== undefined) data.category = category || null;
  if (description !== undefined) data.description = description || null;
  if (responsibleParty !== undefined) data.responsibleParty = responsibleParty || null;
  if (criticalPath !== undefined) data.criticalPath = criticalPath === true;
  if (daysImpact !== undefined) data.daysImpact = parseIntOrNull(daysImpact);
  if (mitigation !== undefined) data.mitigation = mitigation || null;
  if (eotReference !== undefined) data.eotReference = eotReference || null;
  if (notes !== undefined) data.notes = notes || null;

  const started = parseDate(dateStarted);
  if (started !== undefined) data.dateStarted = started ?? before.dateStarted;
  const ended = parseDate(dateEnded);
  if (ended !== undefined) data.dateEnded = ended;

  if (status !== undefined) {
    if (!STATUSES.includes(status as string)) {
      return res.status(400).json({ error: "status must be ONGOING or RESOLVED" });
    }
    data.status = status;
    // Resolving stamps the end date (unless one was supplied); reopening clears it.
    if (status !== before.status && dateEnded === undefined) {
      data.dateEnded = status === "RESOLVED" ? new Date() : null;
    }
  }

  const effectiveStart = (data.dateStarted as Date | undefined) ?? before.dateStarted;
  const effectiveEnd = "dateEnded" in data ? (data.dateEnded as Date | null) : before.dateEnded;
  if (effectiveEnd && effectiveEnd < effectiveStart) {
    return res.status(400).json({ error: "The end date cannot be before the start date" });
  }

  try {
    const delay = await prisma.delay.update({ where: { id: req.params.id }, data });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeDelayUpdate(before, data),
    });
    res.json(delay);
  } catch (err) {
    res.status(400).json({ error: "Unable to update delay" });
  }
});

delaysRouter.delete("/:id", async (req, res) => {
  const delay = await prisma.delay.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!delay) return res.status(404).json({ error: "Delay not found" });

  await logActivity({
    projectId: delay.project.id,
    projectName: delay.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted delay "${delay.title}"`,
  });
  await prisma.delay.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectDelaysRouter;
