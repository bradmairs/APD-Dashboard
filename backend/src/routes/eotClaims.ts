import { Request, Response, Router } from "express";
import { EotStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { describeEotClaimUpdate, logActivity } from "../activityLog";

const STATUSES = ["SUBMITTED", "APPROVED", "REJECTED"];

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

const projectEotClaimsRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectEotClaimsRouter.get(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const claims = await prisma.eotClaim.findMany({
      where: { projectId: req.params.id },
      orderBy: { dateSubmitted: "desc" },
    });
    res.json(claims);
  }
);

projectEotClaimsRouter.post(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const {
      reference,
      title,
      cause,
      description,
      daysClaimed,
      daysGranted,
      status,
      dateSubmitted,
      notes,
    } = req.body as Record<string, unknown>;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    const parsedDaysClaimed = Number(daysClaimed);
    if (daysClaimed === undefined || daysClaimed === null || Number.isNaN(parsedDaysClaimed)) {
      return res.status(400).json({ error: "A valid number of days claimed is required" });
    }
    const parsedDateSubmitted = parseRequiredDate(dateSubmitted);
    if (!parsedDateSubmitted) {
      return res.status(400).json({ error: "A valid date submitted is required" });
    }
    if (status !== undefined && !STATUSES.includes(status as string)) {
      return res.status(400).json({ error: "status must be SUBMITTED, APPROVED or REJECTED" });
    }

    const resolvedStatus = (status as EotStatus) ?? "SUBMITTED";

    const claim = await prisma.eotClaim.create({
      data: {
        projectId: req.params.id,
        reference: (reference as string) || null,
        title: title.trim(),
        cause: (cause as string) || null,
        description: (description as string) || null,
        daysClaimed: Math.trunc(parsedDaysClaimed),
        daysGranted: parseIntOrNull(daysGranted),
        status: resolvedStatus,
        dateSubmitted: parsedDateSubmitted,
        dateDecided: resolvedStatus !== "SUBMITTED" ? new Date() : null,
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
      action: `submitted EOT claim "${claim.title}"`,
    });

    res.status(201).json(claim);
  }
);

export const eotClaimsRouter = Router();

// Every EOT claim across every project, so the dashboard's portfolio
// health rollup can compute each project's revised completion date
// without one request per project.
eotClaimsRouter.get("/", async (_req, res) => {
  const claims = await prisma.eotClaim.findMany({
    orderBy: { dateSubmitted: "desc" },
  });
  res.json(claims);
});

eotClaimsRouter.put("/:id", async (req, res) => {
  const before = await prisma.eotClaim.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "EOT claim not found" });

  const {
    reference,
    title,
    cause,
    description,
    daysClaimed,
    daysGranted,
    status,
    dateSubmitted,
    dateDecided,
    notes,
  } = req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (reference !== undefined) data.reference = reference || null;
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    data.title = title.trim();
  }
  if (cause !== undefined) data.cause = cause || null;
  if (description !== undefined) data.description = description || null;
  if (daysClaimed !== undefined) {
    const parsed = Number(daysClaimed);
    if (Number.isNaN(parsed)) {
      return res.status(400).json({ error: "A valid number of days claimed is required" });
    }
    data.daysClaimed = Math.trunc(parsed);
  }
  if (daysGranted !== undefined) data.daysGranted = parseIntOrNull(daysGranted);
  if (status !== undefined) {
    if (!STATUSES.includes(status as string)) {
      return res.status(400).json({ error: "status must be SUBMITTED, APPROVED or REJECTED" });
    }
    data.status = status;
    if (status !== before.status && dateDecided === undefined) {
      data.dateDecided = status === "SUBMITTED" ? null : new Date();
    }
  }
  const submitted = parseDate(dateSubmitted);
  if (submitted !== undefined) data.dateSubmitted = submitted ?? before.dateSubmitted;
  const decided = parseDate(dateDecided);
  if (decided !== undefined) data.dateDecided = decided;
  if (notes !== undefined) data.notes = notes || null;

  try {
    const claim = await prisma.eotClaim.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeEotClaimUpdate(before, data),
    });
    res.json(claim);
  } catch (err) {
    res.status(400).json({ error: "Unable to update EOT claim" });
  }
});

eotClaimsRouter.delete("/:id", async (req, res) => {
  const claim = await prisma.eotClaim.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!claim) return res.status(404).json({ error: "EOT claim not found" });

  await logActivity({
    projectId: claim.project.id,
    projectName: claim.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted EOT claim "${claim.title}"`,
  });
  await prisma.eotClaim.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectEotClaimsRouter;
