import { Request, Response, Router } from "express";
import { ChecklistItemStatus, ChecklistPhase } from "@prisma/client";
import { prisma } from "../prisma";
import { describeChecklistItemUpdate, logActivity } from "../activityLog";

const PHASES = ["COMMISSIONING", "HANDOVER", "PROCUREMENT"];
const STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETE", "NOT_APPLICABLE"];

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value as string) : null;
}

const projectChecklistItemsRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectChecklistItemsRouter.get(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const items = await prisma.checklistItem.findMany({
      where: { projectId: req.params.id },
      orderBy: [{ phase: "asc" }, { createdAt: "asc" }],
    });
    res.json(items);
  }
);

projectChecklistItemsRouter.post(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const { phase, title, description, responsible, dueDate, status, notes } =
      req.body as Record<string, unknown>;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (!PHASES.includes(phase as string)) {
      return res
        .status(400)
        .json({ error: "phase must be COMMISSIONING, HANDOVER or PROCUREMENT" });
    }
    if (status !== undefined && !STATUSES.includes(status as string)) {
      return res
        .status(400)
        .json({ error: "status must be NOT_STARTED, IN_PROGRESS, COMPLETE or NOT_APPLICABLE" });
    }

    const resolvedStatus = (status as ChecklistItemStatus) ?? "NOT_STARTED";

    const item = await prisma.checklistItem.create({
      data: {
        projectId: req.params.id,
        phase: phase as ChecklistPhase,
        title: title.trim(),
        description: (description as string) || null,
        responsible: (responsible as string) || null,
        dueDate: dueDate ? new Date(dueDate as string) : null,
        status: resolvedStatus,
        completedDate: resolvedStatus === "COMPLETE" ? new Date() : null,
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
      action: `added ${item.phase.toLowerCase()} item "${item.title}"`,
    });

    res.status(201).json(item);
  }
);

export const checklistItemsRouter = Router();

checklistItemsRouter.put("/:id", async (req, res) => {
  const before = await prisma.checklistItem.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Checklist item not found" });

  const { phase, title, description, responsible, dueDate, status, notes } =
    req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (phase !== undefined) {
    if (!PHASES.includes(phase as string)) {
      return res
        .status(400)
        .json({ error: "phase must be COMMISSIONING, HANDOVER or PROCUREMENT" });
    }
    data.phase = phase;
  }
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    data.title = title.trim();
  }
  if (description !== undefined) data.description = description || null;
  if (responsible !== undefined) data.responsible = responsible || null;
  const due = parseDate(dueDate);
  if (due !== undefined) data.dueDate = due;
  if (status !== undefined) {
    if (!STATUSES.includes(status as string)) {
      return res
        .status(400)
        .json({ error: "status must be NOT_STARTED, IN_PROGRESS, COMPLETE or NOT_APPLICABLE" });
    }
    data.status = status;
    if (status !== before.status) {
      data.completedDate = status === "COMPLETE" ? new Date() : null;
    }
  }
  if (notes !== undefined) data.notes = notes || null;

  try {
    const item = await prisma.checklistItem.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeChecklistItemUpdate(before, data),
    });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: "Unable to update checklist item" });
  }
});

checklistItemsRouter.delete("/:id", async (req, res) => {
  const item = await prisma.checklistItem.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!item) return res.status(404).json({ error: "Checklist item not found" });

  await logActivity({
    projectId: item.project.id,
    projectName: item.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted ${item.phase === "HANDOVER" ? "handover" : "commissioning"} item "${item.title}"`,
  });
  await prisma.checklistItem.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectChecklistItemsRouter;
