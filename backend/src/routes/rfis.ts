import { Request, Response, Router } from "express";
import { RfiStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { describeRfiUpdate, logActivity } from "../activityLog";

const STATUSES = ["OPEN", "ANSWERED", "CLOSED"];
const ANSWERED_IMPLYING_STATUSES = ["ANSWERED", "CLOSED"];

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value as string) : null;
}

function parseRequiredDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const projectRfisRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectRfisRouter.get("/", async (req: Request<ProjectParams>, res: Response) => {
  const rfis = await prisma.rfi.findMany({
    where: { projectId: req.params.id },
    orderBy: { dateRaised: "desc" },
  });
  res.json(rfis);
});

projectRfisRouter.post("/", async (req: Request<ProjectParams>, res: Response) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const {
    rfiNumber,
    subject,
    question,
    response,
    raisedTo,
    status,
    dateRaised,
    dateRequired,
    notes,
  } = req.body as Record<string, unknown>;

  if (typeof rfiNumber !== "string" || !rfiNumber.trim()) {
    return res.status(400).json({ error: "RFI number is required" });
  }
  if (typeof subject !== "string" || !subject.trim()) {
    return res.status(400).json({ error: "Subject is required" });
  }
  if (typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ error: "Question is required" });
  }
  const parsedDateRaised = parseRequiredDate(dateRaised);
  if (!parsedDateRaised) {
    return res.status(400).json({ error: "A valid date raised is required" });
  }
  if (status !== undefined && !STATUSES.includes(status as string)) {
    return res.status(400).json({ error: "status must be OPEN, ANSWERED or CLOSED" });
  }

  const resolvedStatus = (status as RfiStatus) ?? "OPEN";
  const answered = ANSWERED_IMPLYING_STATUSES.includes(resolvedStatus);

  const rfi = await prisma.rfi.create({
    data: {
      projectId: req.params.id,
      rfiNumber: rfiNumber.trim(),
      subject: subject.trim(),
      question: question.trim(),
      response: (response as string) || null,
      raisedTo: (raisedTo as string) || null,
      status: resolvedStatus,
      dateRaised: parsedDateRaised,
      dateRequired: parseDate(dateRequired) ?? null,
      dateAnswered: answered ? new Date() : null,
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
    action: `raised RFI "${rfi.rfiNumber}: ${rfi.subject}"`,
  });

  res.status(201).json(rfi);
});

export const rfisRouter = Router();

// Every RFI across every project, for the portfolio-wide Open RFIs
// panel on the dashboard — avoids one request per project.
rfisRouter.get("/", async (_req, res) => {
  const rfis = await prisma.rfi.findMany({
    orderBy: { dateRaised: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
  res.json(rfis);
});

rfisRouter.put("/:id", async (req, res) => {
  const before = await prisma.rfi.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "RFI not found" });

  const {
    rfiNumber,
    subject,
    question,
    response,
    raisedTo,
    status,
    dateRaised,
    dateRequired,
    notes,
  } = req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (rfiNumber !== undefined) {
    if (typeof rfiNumber !== "string" || !rfiNumber.trim()) {
      return res.status(400).json({ error: "RFI number is required" });
    }
    data.rfiNumber = rfiNumber.trim();
  }
  if (subject !== undefined) {
    if (typeof subject !== "string" || !subject.trim()) {
      return res.status(400).json({ error: "Subject is required" });
    }
    data.subject = subject.trim();
  }
  if (question !== undefined) {
    if (typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }
    data.question = question.trim();
  }
  if (response !== undefined) data.response = response || null;
  if (raisedTo !== undefined) data.raisedTo = raisedTo || null;
  const raised = parseDate(dateRaised);
  if (raised !== undefined) data.dateRaised = raised ?? before.dateRaised;
  const required = parseDate(dateRequired);
  if (required !== undefined) data.dateRequired = required;
  if (notes !== undefined) data.notes = notes || null;
  if (status !== undefined) {
    if (!STATUSES.includes(status as string)) {
      return res.status(400).json({ error: "status must be OPEN, ANSWERED or CLOSED" });
    }
    data.status = status;
    if (status !== before.status) {
      const answered = ANSWERED_IMPLYING_STATUSES.includes(status as string);
      data.dateAnswered = answered ? before.dateAnswered ?? new Date() : null;
    }
  }

  try {
    const rfi = await prisma.rfi.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeRfiUpdate(before, data),
    });
    res.json(rfi);
  } catch (err) {
    res.status(400).json({ error: "Unable to update RFI" });
  }
});

rfisRouter.delete("/:id", async (req, res) => {
  const rfi = await prisma.rfi.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!rfi) return res.status(404).json({ error: "RFI not found" });

  await logActivity({
    projectId: rfi.project.id,
    projectName: rfi.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted RFI "${rfi.rfiNumber}: ${rfi.subject}"`,
  });
  await prisma.rfi.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectRfisRouter;
