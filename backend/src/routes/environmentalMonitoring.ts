import { Request, Response, Router } from "express";
import { LimitType } from "@prisma/client";
import { prisma } from "../prisma";
import { describeEnvironmentalMonitoringUpdate, logActivity } from "../activityLog";

const LIMIT_TYPES = ["MAX", "MIN"];

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value as string) : null;
}

function parseRequiredDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

const projectEnvironmentalMonitoringRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectEnvironmentalMonitoringRouter.get(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const records = await prisma.environmentalMonitoringRecord.findMany({
      where: { projectId: req.params.id },
      orderBy: { monitoringDate: "desc" },
    });
    res.json(records);
  }
);

projectEnvironmentalMonitoringRouter.post(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const {
      parameter,
      location,
      monitoringDate,
      readingValue,
      unit,
      limitValue,
      limitType,
      correctiveAction,
      notes,
    } = req.body as Record<string, unknown>;

    if (typeof parameter !== "string" || !parameter.trim()) {
      return res.status(400).json({ error: "Parameter is required" });
    }
    const parsedMonitoringDate = parseRequiredDate(monitoringDate);
    if (!parsedMonitoringDate) {
      return res.status(400).json({ error: "A valid monitoring date is required" });
    }
    const parsedReadingValue = parseNumber(readingValue);
    if (parsedReadingValue === null) {
      return res.status(400).json({ error: "A valid reading value is required" });
    }
    if (typeof unit !== "string" || !unit.trim()) {
      return res.status(400).json({ error: "Unit is required" });
    }
    if (limitType !== undefined && !LIMIT_TYPES.includes(limitType as string)) {
      return res.status(400).json({ error: "limitType must be MAX or MIN" });
    }
    const parsedLimitValue = limitValue === undefined || limitValue === null || limitValue === ""
      ? null
      : parseNumber(limitValue);
    if (limitValue !== undefined && limitValue !== null && limitValue !== "" && parsedLimitValue === null) {
      return res.status(400).json({ error: "Limit value must be a number" });
    }

    const record = await prisma.environmentalMonitoringRecord.create({
      data: {
        projectId: req.params.id,
        parameter: parameter.trim(),
        location: (location as string) || null,
        monitoringDate: parsedMonitoringDate,
        readingValue: parsedReadingValue,
        unit: unit.trim(),
        limitValue: parsedLimitValue,
        limitType: (limitType as LimitType) ?? "MAX",
        correctiveAction: (correctiveAction as string) || null,
        notes: (notes as string) || null,
        monitoredById: req.user!.sub,
        monitoredByName: req.user!.name,
      },
    });

    await logActivity({
      projectId: project.id,
      projectName: project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: `logged an environmental monitoring reading for "${record.parameter}"`,
    });

    res.status(201).json(record);
  }
);

export const environmentalMonitoringRouter = Router();

// Every record across every project, for the portfolio-wide Environmental
// Exceedances panel on the dashboard — avoids one request per project.
environmentalMonitoringRouter.get("/", async (_req, res) => {
  const records = await prisma.environmentalMonitoringRecord.findMany({
    orderBy: { monitoringDate: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
  res.json(records);
});

environmentalMonitoringRouter.put("/:id", async (req, res) => {
  const before = await prisma.environmentalMonitoringRecord.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Environmental monitoring record not found" });

  const {
    parameter,
    location,
    monitoringDate,
    readingValue,
    unit,
    limitValue,
    limitType,
    correctiveAction,
    notes,
  } = req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (parameter !== undefined) {
    if (typeof parameter !== "string" || !parameter.trim()) {
      return res.status(400).json({ error: "Parameter is required" });
    }
    data.parameter = parameter.trim();
  }
  if (location !== undefined) data.location = location || null;
  const date = parseDate(monitoringDate);
  if (date !== undefined) data.monitoringDate = date ?? before.monitoringDate;
  if (readingValue !== undefined) {
    const parsedReadingValue = parseNumber(readingValue);
    if (parsedReadingValue === null) {
      return res.status(400).json({ error: "A valid reading value is required" });
    }
    data.readingValue = parsedReadingValue;
  }
  if (unit !== undefined) {
    if (typeof unit !== "string" || !unit.trim()) {
      return res.status(400).json({ error: "Unit is required" });
    }
    data.unit = unit.trim();
  }
  if (limitValue !== undefined) {
    data.limitValue = limitValue === null || limitValue === "" ? null : parseNumber(limitValue);
    if (limitValue !== null && limitValue !== "" && data.limitValue === null) {
      return res.status(400).json({ error: "Limit value must be a number" });
    }
  }
  if (limitType !== undefined) {
    if (!LIMIT_TYPES.includes(limitType as string)) {
      return res.status(400).json({ error: "limitType must be MAX or MIN" });
    }
    data.limitType = limitType;
  }
  if (correctiveAction !== undefined) data.correctiveAction = correctiveAction || null;
  if (notes !== undefined) data.notes = notes || null;

  try {
    const record = await prisma.environmentalMonitoringRecord.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeEnvironmentalMonitoringUpdate(before),
    });
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: "Unable to update environmental monitoring record" });
  }
});

environmentalMonitoringRouter.delete("/:id", async (req, res) => {
  const record = await prisma.environmentalMonitoringRecord.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!record) return res.status(404).json({ error: "Environmental monitoring record not found" });

  await logActivity({
    projectId: record.project.id,
    projectName: record.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted the environmental monitoring reading for "${record.parameter}"`,
  });
  await prisma.environmentalMonitoringRecord.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectEnvironmentalMonitoringRouter;
