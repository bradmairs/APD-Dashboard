import { Request, Response, Router } from "express";
import { SafetyInspectionStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { describeSafetyInspectionUpdate, logActivity } from "../activityLog";

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

function parseScore(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
}

const projectSafetyInspectionsRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectSafetyInspectionsRouter.get(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const inspections = await prisma.safetyInspection.findMany({
      where: { projectId: req.params.id },
      orderBy: { inspectionDate: "desc" },
    });
    res.json(inspections);
  }
);

projectSafetyInspectionsRouter.post(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const {
      inspectionDate,
      inspectionType,
      location,
      conductedBy,
      score,
      findings,
      correctiveAction,
      status,
    } = req.body as Record<string, unknown>;

    const parsedInspectionDate = parseRequiredDate(inspectionDate);
    if (!parsedInspectionDate) {
      return res.status(400).json({ error: "A valid inspection date is required" });
    }
    if (typeof inspectionType !== "string" || !inspectionType.trim()) {
      return res.status(400).json({ error: "Inspection type is required" });
    }
    if (typeof conductedBy !== "string" || !conductedBy.trim()) {
      return res.status(400).json({ error: "Conducted by is required" });
    }
    const parsedScore = parseScore(score);
    if (parsedScore === undefined) {
      return res.status(400).json({ error: "Score must be a number" });
    }
    if (parsedScore !== null && (parsedScore < 0 || parsedScore > 100)) {
      return res.status(400).json({ error: "Score must be between 0 and 100" });
    }
    if (status !== undefined && !STATUSES.includes(status as string)) {
      return res.status(400).json({ error: "status must be OPEN, IN_PROGRESS or CLOSED" });
    }

    const resolvedStatus = (status as SafetyInspectionStatus) ?? "OPEN";

    const inspection = await prisma.safetyInspection.create({
      data: {
        projectId: req.params.id,
        inspectionDate: parsedInspectionDate,
        inspectionType: inspectionType.trim(),
        location: (location as string) || null,
        conductedBy: conductedBy.trim(),
        score: parsedScore,
        findings: (findings as string) || null,
        correctiveAction: (correctiveAction as string) || null,
        status: resolvedStatus,
        dateClosed: resolvedStatus === "CLOSED" ? new Date() : null,
        recordedById: req.user!.sub,
        recordedByName: req.user!.name,
      },
    });

    await logActivity({
      projectId: project.id,
      projectName: project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: `logged a safety inspection "${inspection.inspectionType}"`,
    });

    res.status(201).json(inspection);
  }
);

export const safetyInspectionsRouter = Router();

// Every inspection across every project, for the portfolio-wide Open
// Safety Inspections panel on the dashboard — avoids one request per project.
safetyInspectionsRouter.get("/", async (_req, res) => {
  const inspections = await prisma.safetyInspection.findMany({
    orderBy: { inspectionDate: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
  res.json(inspections);
});

safetyInspectionsRouter.put("/:id", async (req, res) => {
  const before = await prisma.safetyInspection.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Safety inspection not found" });

  const {
    inspectionDate,
    inspectionType,
    location,
    conductedBy,
    score,
    findings,
    correctiveAction,
    status,
  } = req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  const date = parseDate(inspectionDate);
  if (date !== undefined) data.inspectionDate = date ?? before.inspectionDate;
  if (inspectionType !== undefined) {
    if (typeof inspectionType !== "string" || !inspectionType.trim()) {
      return res.status(400).json({ error: "Inspection type is required" });
    }
    data.inspectionType = inspectionType.trim();
  }
  if (location !== undefined) data.location = location || null;
  if (conductedBy !== undefined) {
    if (typeof conductedBy !== "string" || !conductedBy.trim()) {
      return res.status(400).json({ error: "Conducted by is required" });
    }
    data.conductedBy = conductedBy.trim();
  }
  if (score !== undefined) {
    const parsedScore = parseScore(score);
    if (parsedScore === undefined) {
      return res.status(400).json({ error: "Score must be a number" });
    }
    if (parsedScore !== null && (parsedScore < 0 || parsedScore > 100)) {
      return res.status(400).json({ error: "Score must be between 0 and 100" });
    }
    data.score = parsedScore;
  }
  if (findings !== undefined) data.findings = findings || null;
  if (correctiveAction !== undefined) data.correctiveAction = correctiveAction || null;
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
    const inspection = await prisma.safetyInspection.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeSafetyInspectionUpdate(before, data),
    });
    res.json(inspection);
  } catch (err) {
    res.status(400).json({ error: "Unable to update safety inspection" });
  }
});

safetyInspectionsRouter.delete("/:id", async (req, res) => {
  const inspection = await prisma.safetyInspection.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!inspection) return res.status(404).json({ error: "Safety inspection not found" });

  await logActivity({
    projectId: inspection.project.id,
    projectName: inspection.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted the safety inspection "${inspection.inspectionType}"`,
  });
  await prisma.safetyInspection.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectSafetyInspectionsRouter;
