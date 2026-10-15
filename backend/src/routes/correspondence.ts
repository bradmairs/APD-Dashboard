import { Request, Response, Router } from "express";
import { CorrespondenceDirection, CorrespondenceStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { describeCorrespondenceUpdate, logActivity } from "../activityLog";

const DIRECTIONS = ["INCOMING", "OUTGOING"];
const STATUSES = ["OPEN", "CLOSED"];

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value as string) : null;
}

function parseRequiredDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const projectCorrespondenceRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectCorrespondenceRouter.get("/", async (req: Request<ProjectParams>, res: Response) => {
  const items = await prisma.correspondence.findMany({
    where: { projectId: req.params.id },
    orderBy: { dateSent: "desc" },
  });
  res.json(items);
});

projectCorrespondenceRouter.post("/", async (req: Request<ProjectParams>, res: Response) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const {
    reference,
    direction,
    correspondent,
    subject,
    summary,
    dateSent,
    responseDueDate,
    status,
    notes,
  } = req.body as Record<string, unknown>;

  if (!DIRECTIONS.includes(direction as string)) {
    return res.status(400).json({ error: "direction must be INCOMING or OUTGOING" });
  }
  if (typeof correspondent !== "string" || !correspondent.trim()) {
    return res.status(400).json({ error: "Correspondent is required" });
  }
  if (typeof subject !== "string" || !subject.trim()) {
    return res.status(400).json({ error: "Subject is required" });
  }
  const parsedDateSent = parseRequiredDate(dateSent);
  if (!parsedDateSent) {
    return res.status(400).json({ error: "A valid date sent is required" });
  }
  if (status !== undefined && !STATUSES.includes(status as string)) {
    return res.status(400).json({ error: "status must be OPEN or CLOSED" });
  }

  const resolvedStatus = (status as CorrespondenceStatus) ?? "OPEN";

  const item = await prisma.correspondence.create({
    data: {
      projectId: req.params.id,
      reference: (reference as string) || null,
      direction: direction as CorrespondenceDirection,
      correspondent: correspondent.trim(),
      subject: subject.trim(),
      summary: (summary as string) || null,
      dateSent: parsedDateSent,
      responseDueDate: parseDate(responseDueDate) ?? null,
      status: resolvedStatus,
      dateClosed: resolvedStatus === "CLOSED" ? new Date() : null,
      notes: (notes as string) || null,
      loggedById: req.user!.sub,
      loggedByName: req.user!.name,
    },
  });

  await logActivity({
    projectId: project.id,
    projectName: project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `logged correspondence "${item.subject}"`,
  });

  res.status(201).json(item);
});

export const correspondenceRouter = Router();

// Every correspondence item across every project, for a portfolio-wide
// Open Correspondence panel on the dashboard — avoids one request per
// project.
correspondenceRouter.get("/", async (_req, res) => {
  const items = await prisma.correspondence.findMany({
    orderBy: { dateSent: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
  res.json(items);
});

correspondenceRouter.put("/:id", async (req, res) => {
  const before = await prisma.correspondence.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Correspondence not found" });

  const {
    reference,
    direction,
    correspondent,
    subject,
    summary,
    dateSent,
    responseDueDate,
    status,
    notes,
  } = req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (reference !== undefined) data.reference = reference || null;
  if (direction !== undefined) {
    if (!DIRECTIONS.includes(direction as string)) {
      return res.status(400).json({ error: "direction must be INCOMING or OUTGOING" });
    }
    data.direction = direction;
  }
  if (correspondent !== undefined) {
    if (typeof correspondent !== "string" || !correspondent.trim()) {
      return res.status(400).json({ error: "Correspondent is required" });
    }
    data.correspondent = correspondent.trim();
  }
  if (subject !== undefined) {
    if (typeof subject !== "string" || !subject.trim()) {
      return res.status(400).json({ error: "Subject is required" });
    }
    data.subject = subject.trim();
  }
  if (summary !== undefined) data.summary = summary || null;
  const sent = parseDate(dateSent);
  if (sent !== undefined) data.dateSent = sent ?? before.dateSent;
  const dueDate = parseDate(responseDueDate);
  if (dueDate !== undefined) data.responseDueDate = dueDate;
  if (notes !== undefined) data.notes = notes || null;
  if (status !== undefined) {
    if (!STATUSES.includes(status as string)) {
      return res.status(400).json({ error: "status must be OPEN or CLOSED" });
    }
    data.status = status;
    if (status !== before.status) {
      data.dateClosed = status === "CLOSED" ? new Date() : null;
    }
  }

  try {
    const item = await prisma.correspondence.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeCorrespondenceUpdate(before, data),
    });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: "Unable to update correspondence" });
  }
});

correspondenceRouter.delete("/:id", async (req, res) => {
  const item = await prisma.correspondence.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!item) return res.status(404).json({ error: "Correspondence not found" });

  await logActivity({
    projectId: item.project.id,
    projectName: item.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted correspondence "${item.subject}"`,
  });
  await prisma.correspondence.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectCorrespondenceRouter;
