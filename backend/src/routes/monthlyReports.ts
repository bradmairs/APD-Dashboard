import { Request, Response, Router } from "express";
import { prisma } from "../prisma";
import { logActivity } from "../activityLog";
import { canModifyReport } from "../permissions";

const RAG_VALUES = new Set(["GREEN", "AMBER", "RED"]);

function normalizeReportingMonth(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return new Date(Date.UTC(year, month - 1, 1));
}

function formatReportMonth(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function validateRag(value: unknown): "GREEN" | "AMBER" | "RED" | undefined | null {
  if (value === undefined) return undefined;
  return RAG_VALUES.has(value as string) ? (value as "GREEN" | "AMBER" | "RED") : null;
}

const projectReportsRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectReportsRouter.get(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const reports = await prisma.monthlyReport.findMany({
      where: { projectId: req.params.id },
      orderBy: { reportingMonth: "desc" },
    });
    res.json(reports);
  }
);

projectReportsRouter.post(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const {
      reportingMonth,
      projectPhase,
      currentStatus,
      recentlyCompleted,
      monthlyLookahead,
      budgetHealth,
      budgetComments,
      scheduleHealth,
      scheduleComments,
    } = req.body as Record<string, unknown>;

    const month = normalizeReportingMonth(reportingMonth);
    if (!month) {
      return res.status(400).json({ error: "A valid reporting month is required" });
    }
    if (typeof projectPhase !== "string" || !projectPhase.trim()) {
      return res.status(400).json({ error: "Project phase is required" });
    }
    if (typeof currentStatus !== "string" || !currentStatus.trim()) {
      return res.status(400).json({ error: "Current status is required" });
    }
    const budgetRag = validateRag(budgetHealth);
    const scheduleRag = validateRag(scheduleHealth);
    if (budgetRag === null || scheduleRag === null) {
      return res.status(400).json({ error: "Health must be GREEN, AMBER, or RED" });
    }

    try {
      const report = await prisma.monthlyReport.create({
        data: {
          projectId: req.params.id,
          reportingMonth: month,
          projectPhase: projectPhase.trim(),
          currentStatus: currentStatus.trim(),
          recentlyCompleted: (recentlyCompleted as string) || null,
          monthlyLookahead: (monthlyLookahead as string) || null,
          budgetHealth: budgetRag ?? "GREEN",
          budgetComments: (budgetComments as string) || null,
          scheduleHealth: scheduleRag ?? "GREEN",
          scheduleComments: (scheduleComments as string) || null,
          createdById: req.user!.sub,
          authorName: req.user!.name,
        },
      });
      await logActivity({
        projectId: project.id,
        projectName: project.name,
        userId: req.user!.sub,
        userName: req.user!.name,
        action: `created the ${formatReportMonth(month)} monthly report`,
      });
      res.status(201).json(report);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "P2002") {
        return res
          .status(409)
          .json({ error: "A report already exists for that month" });
      }
      res.status(400).json({ error: "Unable to create monthly report" });
    }
  }
);

export const reportsRouter = Router();

reportsRouter.get("/:id", async (req, res) => {
  const report = await prisma.monthlyReport.findUnique({ where: { id: req.params.id } });
  if (!report) return res.status(404).json({ error: "Report not found" });
  res.json(report);
});

reportsRouter.put("/:id", async (req, res) => {
  const before = await prisma.monthlyReport.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Report not found" });
  if (!canModifyReport(before, req.user!)) {
    return res
      .status(403)
      .json({ error: "Only the report's author or an admin can edit it" });
  }

  const {
    reportingMonth,
    projectPhase,
    currentStatus,
    recentlyCompleted,
    monthlyLookahead,
    budgetHealth,
    budgetComments,
    scheduleHealth,
    scheduleComments,
  } = req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (reportingMonth !== undefined) {
    const month = normalizeReportingMonth(reportingMonth);
    if (!month) {
      return res.status(400).json({ error: "A valid reporting month is required" });
    }
    data.reportingMonth = month;
  }
  if (projectPhase !== undefined) {
    if (typeof projectPhase !== "string" || !projectPhase.trim()) {
      return res.status(400).json({ error: "Project phase is required" });
    }
    data.projectPhase = projectPhase.trim();
  }
  if (currentStatus !== undefined) {
    if (typeof currentStatus !== "string" || !currentStatus.trim()) {
      return res.status(400).json({ error: "Current status is required" });
    }
    data.currentStatus = currentStatus.trim();
  }
  if (recentlyCompleted !== undefined) data.recentlyCompleted = recentlyCompleted || null;
  if (monthlyLookahead !== undefined) data.monthlyLookahead = monthlyLookahead || null;
  if (budgetHealth !== undefined) {
    const rag = validateRag(budgetHealth);
    if (!rag) return res.status(400).json({ error: "Health must be GREEN, AMBER, or RED" });
    data.budgetHealth = rag;
  }
  if (budgetComments !== undefined) data.budgetComments = budgetComments || null;
  if (scheduleHealth !== undefined) {
    const rag = validateRag(scheduleHealth);
    if (!rag) return res.status(400).json({ error: "Health must be GREEN, AMBER, or RED" });
    data.scheduleHealth = rag;
  }
  if (scheduleComments !== undefined) data.scheduleComments = scheduleComments || null;

  try {
    const report = await prisma.monthlyReport.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: `updated the ${formatReportMonth(before.reportingMonth)} monthly report`,
    });
    res.json(report);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "P2002") {
      return res
        .status(409)
        .json({ error: "A report already exists for that month" });
    }
    res.status(400).json({ error: "Unable to update monthly report" });
  }
});

reportsRouter.delete("/:id", async (req, res) => {
  const report = await prisma.monthlyReport.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!report) return res.status(404).json({ error: "Report not found" });
  if (!canModifyReport(report, req.user!)) {
    return res
      .status(403)
      .json({ error: "Only the report's author or an admin can delete it" });
  }

  await logActivity({
    projectId: report.project.id,
    projectName: report.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted the ${formatReportMonth(report.reportingMonth)} monthly report`,
  });
  await prisma.monthlyReport.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectReportsRouter;
