import { Request, Response, Router } from "express";
import { ActionItemStatus, ActionType } from "@prisma/client";
import { prisma } from "../prisma";
import { describeActionItemUpdate, logActivity } from "../activityLog";

const ACTION_TYPES = ["ACTION", "DECISION"];
const STATUSES = ["OPEN", "IN_PROGRESS", "DONE"];

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value as string) : null;
}

function parseRequiredDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const projectActionItemsRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectActionItemsRouter.get(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const actionItems = await prisma.actionItem.findMany({
      where: { projectId: req.params.id },
      orderBy: { dateRaised: "desc" },
    });
    res.json(actionItems);
  }
);

projectActionItemsRouter.post(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const {
      type,
      title,
      description,
      category,
      ownerName,
      dueDate,
      status,
      dateRaised,
      notes,
      meetingMinutesId,
    } = req.body as Record<string, unknown>;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (type !== undefined && !ACTION_TYPES.includes(type as string)) {
      return res.status(400).json({ error: "type must be ACTION or DECISION" });
    }
    const parsedDateRaised = parseRequiredDate(dateRaised);
    if (!parsedDateRaised) {
      return res.status(400).json({ error: "A valid date raised is required" });
    }
    if (status !== undefined && !STATUSES.includes(status as string)) {
      return res.status(400).json({ error: "status must be OPEN, IN_PROGRESS or DONE" });
    }

    const resolvedType = (type as ActionType) ?? "ACTION";
    // A Decision is, by nature, already resolved the moment it's recorded —
    // an Action starts out as work still to be done.
    const resolvedStatus =
      (status as ActionItemStatus) ?? (resolvedType === "DECISION" ? "DONE" : "OPEN");

    const actionItem = await prisma.actionItem.create({
      data: {
        projectId: req.params.id,
        type: resolvedType,
        title: title.trim(),
        description: (description as string) || null,
        category: (category as string) || null,
        ownerName: (ownerName as string) || null,
        dueDate: dueDate ? new Date(dueDate as string) : null,
        status: resolvedStatus,
        dateRaised: parsedDateRaised,
        dateClosed: resolvedStatus === "DONE" ? new Date() : null,
        notes: (notes as string) || null,
        meetingMinutesId: (meetingMinutesId as string) || null,
        raisedById: req.user!.sub,
        raisedByName: req.user!.name,
      },
    });

    await logActivity({
      projectId: project.id,
      projectName: project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: `${resolvedType === "DECISION" ? "recorded decision" : "raised action"} "${actionItem.title}"`,
    });

    res.status(201).json(actionItem);
  }
);

export const actionItemsRouter = Router();

// Every action item across every project, for the portfolio-wide Open
// Actions panel on the dashboard — avoids one request per project.
actionItemsRouter.get("/", async (_req, res) => {
  const actionItems = await prisma.actionItem.findMany({
    orderBy: { dateRaised: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
  res.json(actionItems);
});

actionItemsRouter.put("/:id", async (req, res) => {
  const before = await prisma.actionItem.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Action item not found" });

  const {
    type,
    title,
    description,
    category,
    ownerName,
    dueDate,
    status,
    dateRaised,
    dateClosed,
    notes,
    meetingMinutesId,
  } = req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (type !== undefined) {
    if (!ACTION_TYPES.includes(type as string)) {
      return res.status(400).json({ error: "type must be ACTION or DECISION" });
    }
    data.type = type;
  }
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    data.title = title.trim();
  }
  if (description !== undefined) data.description = description || null;
  if (category !== undefined) data.category = category || null;
  if (ownerName !== undefined) data.ownerName = ownerName || null;
  const due = parseDate(dueDate);
  if (due !== undefined) data.dueDate = due;
  if (status !== undefined) {
    if (!STATUSES.includes(status as string)) {
      return res.status(400).json({ error: "status must be OPEN, IN_PROGRESS or DONE" });
    }
    data.status = status;
    if (status !== before.status && dateClosed === undefined) {
      data.dateClosed = status === "DONE" ? new Date() : null;
    }
  }
  const raised = parseDate(dateRaised);
  if (raised !== undefined) data.dateRaised = raised ?? before.dateRaised;
  const closed = parseDate(dateClosed);
  if (closed !== undefined) data.dateClosed = closed;
  if (notes !== undefined) data.notes = notes || null;
  if (meetingMinutesId !== undefined) data.meetingMinutesId = meetingMinutesId || null;

  try {
    const actionItem = await prisma.actionItem.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeActionItemUpdate(before, data),
    });
    res.json(actionItem);
  } catch (err) {
    res.status(400).json({ error: "Unable to update action item" });
  }
});

actionItemsRouter.delete("/:id", async (req, res) => {
  const actionItem = await prisma.actionItem.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!actionItem) return res.status(404).json({ error: "Action item not found" });

  await logActivity({
    projectId: actionItem.project.id,
    projectName: actionItem.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted ${actionItem.type === "DECISION" ? "decision" : "action"} "${actionItem.title}"`,
  });
  await prisma.actionItem.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectActionItemsRouter;
