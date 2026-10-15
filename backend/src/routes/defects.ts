import { Request, Response, Router } from "express";
import { DefectStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { describeDefectUpdate, logActivity } from "../activityLog";

const STATUSES = ["OPEN", "RECTIFIED", "VERIFIED", "DISPUTED"];

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

const projectDefectsRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectDefectsRouter.get("/", async (req: Request<ProjectParams>, res: Response) => {
  const defects = await prisma.defectItem.findMany({
    where: { projectId: req.params.id },
    orderBy: { dateRaised: "desc" },
  });
  res.json(defects);
});

projectDefectsRouter.post("/", async (req: Request<ProjectParams>, res: Response) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const {
    title,
    description,
    location,
    category,
    assignedTo,
    dueDate,
    status,
    dateRaised,
    retentionHeld,
    notes,
  } = req.body as Record<string, unknown>;

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }
  const parsedDateRaised = parseRequiredDate(dateRaised);
  if (!parsedDateRaised) {
    return res.status(400).json({ error: "A valid date raised is required" });
  }
  if (status !== undefined && !STATUSES.includes(status as string)) {
    return res
      .status(400)
      .json({ error: "status must be OPEN, RECTIFIED, VERIFIED or DISPUTED" });
  }

  const resolvedStatus = (status as DefectStatus) ?? "OPEN";

  const defect = await prisma.defectItem.create({
    data: {
      projectId: req.params.id,
      title: title.trim(),
      description: (description as string) || null,
      location: (location as string) || null,
      category: (category as string) || null,
      assignedTo: (assignedTo as string) || null,
      dueDate: parseDate(dueDate) ?? null,
      status: resolvedStatus,
      dateRaised: parsedDateRaised,
      dateClosed: resolvedStatus === "VERIFIED" ? new Date() : null,
      retentionHeld: parseOptionalNumber(retentionHeld) ?? null,
      raisedById: req.user!.sub,
      raisedByName: req.user!.name,
      notes: (notes as string) || null,
    },
  });

  await logActivity({
    projectId: project.id,
    projectName: project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `raised a defect "${defect.title}"`,
  });

  res.status(201).json(defect);
});

export const defectsRouter = Router();

// Every defect across every project, for the portfolio-wide Open Defects
// panel on the dashboard — avoids one request per project.
defectsRouter.get("/", async (_req, res) => {
  const defects = await prisma.defectItem.findMany({
    orderBy: { dateRaised: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
  res.json(defects);
});

defectsRouter.put("/:id", async (req, res) => {
  const before = await prisma.defectItem.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Defect not found" });

  const {
    title,
    description,
    location,
    category,
    assignedTo,
    dueDate,
    status,
    dateRaised,
    retentionHeld,
    notes,
  } = req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    data.title = title.trim();
  }
  if (description !== undefined) data.description = description || null;
  if (location !== undefined) data.location = location || null;
  if (category !== undefined) data.category = category || null;
  if (assignedTo !== undefined) data.assignedTo = assignedTo || null;
  const due = parseDate(dueDate);
  if (due !== undefined) data.dueDate = due;
  const raised = parseDate(dateRaised);
  if (raised !== undefined) data.dateRaised = raised ?? before.dateRaised;
  if (retentionHeld !== undefined) data.retentionHeld = parseOptionalNumber(retentionHeld);
  if (notes !== undefined) data.notes = notes || null;
  if (status !== undefined) {
    if (!STATUSES.includes(status as string)) {
      return res
        .status(400)
        .json({ error: "status must be OPEN, RECTIFIED, VERIFIED or DISPUTED" });
    }
    data.status = status;
    if (status !== before.status) {
      data.dateClosed = status === "VERIFIED" ? new Date() : null;
    }
  }

  try {
    const defect = await prisma.defectItem.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeDefectUpdate(before, data),
    });
    res.json(defect);
  } catch (err) {
    res.status(400).json({ error: "Unable to update defect" });
  }
});

defectsRouter.delete("/:id", async (req, res) => {
  const defect = await prisma.defectItem.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!defect) return res.status(404).json({ error: "Defect not found" });

  await logActivity({
    projectId: defect.project.id,
    projectName: defect.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted the defect "${defect.title}"`,
  });
  await prisma.defectItem.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectDefectsRouter;
