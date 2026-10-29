import crypto from "crypto";
import fs from "fs";
import path from "path";
import multer from "multer";
import { MonthlyReport, Prisma } from "@prisma/client";
import { NextFunction, Request, Response, Router } from "express";
import { prisma } from "../prisma";
import { logActivity } from "../activityLog";
import { canModifyReport } from "../permissions";
import { projectUploadDir } from "../upload";
import {
  MonthlyReportContent,
  emptyContent,
  healthToRag,
  normalizeContent,
  ragToHealth,
} from "../monthlyReport/model";
import { buildAutofill } from "../monthlyReport/autofill";
import {
  ParsedWorkbook,
  WorkbookError,
  readReportWorkbook,
  writeReportWorkbook,
} from "../monthlyReport/workbook";
import {
  SharePointError,
  downloadFile,
  listReportFiles,
  matchScore,
  uploadFile,
} from "../sharepoint";

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

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
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

// A report saved before the full workbook layout existed only has the
// original handful of columns; lift those into a content document.
export function contentOf(report: MonthlyReport): MonthlyReportContent {
  if (report.content) return normalizeContent(report.content);
  const c = emptyContent();
  c.projectPhase = report.projectPhase;
  c.currentStatus = report.currentStatus;
  c.recentlyCompleted = report.recentlyCompleted ?? "";
  c.monthlyLookahead = report.monthlyLookahead ?? "";
  c.budgetHealth = ragToHealth(report.budgetHealth);
  c.budgetComments = report.budgetComments ?? "";
  c.scheduleHealth = ragToHealth(report.scheduleHealth);
  c.scheduleComments = report.scheduleComments ?? "";
  return c;
}

function withContent(report: MonthlyReport) {
  return { ...report, content: contentOf(report) };
}

// The original columns, kept in step with the content document so the
// health roll-ups and report lists elsewhere keep working.
function legacyColumns(c: MonthlyReportContent) {
  return {
    projectPhase: c.projectPhase.trim() || "-",
    currentStatus: c.currentStatus.trim() || "-",
    recentlyCompleted: c.recentlyCompleted || null,
    monthlyLookahead: c.monthlyLookahead || null,
    budgetHealth: healthToRag(c.budgetHealth),
    budgetComments: c.budgetComments || null,
    scheduleHealth: healthToRag(c.scheduleHealth),
    scheduleComments: c.scheduleComments || null,
  };
}

async function loadAutofillData(projectId: string) {
  const [project, milestones, cashFlow, risks, tasks] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.milestone.findMany({ where: { projectId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.cashFlowEntry.findMany({ where: { projectId } }),
    prisma.risk.findMany({ where: { projectId } }),
    prisma.task.findMany({ where: { projectId } }),
  ]);
  if (!project) return null;
  const n = (d: Prisma.Decimal | null) => (d === null ? null : Number(d));
  return {
    project,
    data: {
      project: {
        name: project.name,
        status: project.status,
        bpRefNo: project.bpRefNo,
        projectNumber: project.projectNumber,
        projectManager: project.projectManager,
        projectDirector: project.projectDirector,
        projectSponsor: project.projectSponsor,
        budget: n(project.budget),
        latestApprovedBudget: n(project.latestApprovedBudget),
        startDate: project.startDate,
        targetCompletionDate: project.targetCompletionDate,
        actualCompletionDate: project.actualCompletionDate,
      },
      milestones,
      cashFlow: cashFlow.map((e) => ({ month: e.month, type: e.type, amount: Number(e.amount) })),
      risks,
      tasks,
    },
  };
}

async function previousContent(projectId: string, before: Date): Promise<MonthlyReportContent | null> {
  const prev = await prisma.monthlyReport.findFirst({
    where: { projectId, reportingMonth: { lt: before } },
    orderBy: { reportingMonth: "desc" },
  });
  return prev ? contentOf(prev) : null;
}

function handleError(res: Response, err: unknown) {
  if (err instanceof SharePointError) return res.status(err.status).json({ error: err.message });
  if (err instanceof WorkbookError) return res.status(400).json({ error: err.message });
  console.error(err);
  return res.status(500).json({ error: "Something went wrong with the monthly report" });
}

const wrap =
  (fn: (req: Request<{ id: string }>, res: Response) => Promise<unknown>) =>
  (req: Request<{ id: string }>, res: Response, next: NextFunction) =>
    fn(req, res).catch((err) => (res.headersSent ? next(err) : handleError(res, err)));

const workbookUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.xls[xm]$/i.test(file.originalname)) cb(null, true);
    else cb(new Error("Upload the monthly report workbook (.xlsm or .xlsx)"));
  },
});

// ---- Workbook import -------------------------------------------------------------

interface ImportSummary {
  created: string[];
  updated: string[];
  skipped: string[];
}

// The month on the Monthly Report tab replaces the dashboard's copy of that
// month (the spreadsheet wins on a pull). Months on the Reporting Log only
// fill in months the dashboard has no report for — the log has fewer fields
// (no milestones or notes), so it never overwrites a fuller report.
async function importWorkbook(
  projectId: string,
  projectName: string,
  parsed: ParsedWorkbook,
  user: NonNullable<Request["user"]>
): Promise<ImportSummary> {
  const summary: ImportSummary = { created: [], updated: [], skipped: [] };
  const existing = await prisma.monthlyReport.findMany({ where: { projectId } });
  const byMonth = new Map(existing.map((r) => [monthKey(r.reportingMonth), r]));
  const months = new Map(parsed.log.map((l) => [l.reportingMonth, { ...l, full: false }]));
  if (parsed.current) months.set(parsed.current.reportingMonth, { ...parsed.current, full: true });

  for (const [month, entry] of [...months].sort(([a], [b]) => a.localeCompare(b))) {
    const label = formatReportMonth(normalizeReportingMonth(month)!);
    const current = byMonth.get(month);
    const data = {
      ...legacyColumns(entry.content),
      content: entry.content as unknown as Prisma.InputJsonValue,
      syncedAt: new Date(),
    };
    if (!current) {
      await prisma.monthlyReport.create({
        data: {
          ...data,
          projectId,
          reportingMonth: normalizeReportingMonth(month)!,
          loggedAt: entry.full ? null : new Date(),
          createdById: user.sub,
          authorName: user.name,
        },
      });
      summary.created.push(label);
    } else if (entry.full && canModifyReport(current, user)) {
      await prisma.monthlyReport.update({ where: { id: current.id }, data });
      summary.updated.push(label);
    } else {
      summary.skipped.push(label);
    }
  }
  if (summary.created.length || summary.updated.length) {
    await logActivity({
      projectId,
      projectName,
      userId: user.sub,
      userName: user.name,
      action: `imported monthly reports from the workbook (${[...summary.created, ...summary.updated].join(", ")})`,
    });
  }
  return summary;
}

function storedWorkbookPath(projectId: string, stored: string) {
  return path.join(projectUploadDir(projectId), path.basename(stored));
}

function workbookInfo(project: {
  monthlyReportFileName: string | null;
  monthlyReportDriveId: string | null;
  monthlyReportItemId: string | null;
  monthlyReportWebUrl: string | null;
  monthlyReportStoredFile: string | null;
}) {
  const source = project.monthlyReportItemId ? "sharepoint" : project.monthlyReportStoredFile ? "upload" : null;
  return {
    source,
    fileName: project.monthlyReportFileName,
    webUrl: project.monthlyReportWebUrl,
  };
}

// ---- /api/projects/:id/reports ---------------------------------------------------

const projectReportsRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectReportsRouter.get(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const reports = await prisma.monthlyReport.findMany({
      where: { projectId: req.params.id },
      orderBy: { reportingMonth: "desc" },
    });
    res.json(reports.map(withContent));
  }
);

// A new month's report, filled from the project and the previous month.
// Nothing is saved until the PM saves it.
projectReportsRouter.get(
  "/draft",
  wrap(async (req, res) => {
    const month = normalizeReportingMonth(req.query.month);
    if (!month) return res.status(400).json({ error: "A valid reporting month is required" });
    const loaded = await loadAutofillData(req.params.id);
    if (!loaded) return res.status(404).json({ error: "Project not found" });
    const result = buildAutofill(loaded.data, monthKey(month), await previousContent(req.params.id, month));
    res.json({ reportingMonth: monthKey(month), ...result });
  })
);

projectReportsRouter.post(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const body = req.body as Record<string, unknown>;
    const month = normalizeReportingMonth(body.reportingMonth);
    if (!month) {
      return res.status(400).json({ error: "A valid reporting month is required" });
    }

    let columns: ReturnType<typeof legacyColumns>;
    let content: MonthlyReportContent | null = null;
    if (body.content !== undefined) {
      content = normalizeContent(body.content);
      columns = legacyColumns(content);
    } else {
      // The original short form: phase, status, two narratives and health.
      const { projectPhase, currentStatus, recentlyCompleted, monthlyLookahead,
        budgetHealth, budgetComments, scheduleHealth, scheduleComments } = body;
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
      columns = {
        projectPhase: projectPhase.trim(),
        currentStatus: currentStatus.trim(),
        recentlyCompleted: (recentlyCompleted as string) || null,
        monthlyLookahead: (monthlyLookahead as string) || null,
        budgetHealth: budgetRag ?? "GREEN",
        budgetComments: (budgetComments as string) || null,
        scheduleHealth: scheduleRag ?? "GREEN",
        scheduleComments: (scheduleComments as string) || null,
      };
    }

    try {
      const report = await prisma.monthlyReport.create({
        data: {
          projectId: req.params.id,
          reportingMonth: month,
          ...columns,
          content: content ? (content as unknown as Prisma.InputJsonValue) : undefined,
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
      res.status(201).json(withContent(report));
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

projectReportsRouter.get(
  "/workbook",
  wrap(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(workbookInfo(project));
  })
);

// Upload the project's workbook: keeps it as the project's copy (each
// export then writes into it) and imports its months.
projectReportsRouter.post(
  "/workbook",
  (req: Request<ProjectParams>, res: Response, next: NextFunction) =>
    workbookUpload.single("file")(req, res, (err: unknown) =>
      err ? res.status(400).json({ error: (err as Error).message }) : next()
    ),
  wrap(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const parsed = await readReportWorkbook(req.file.buffer);
    const dir = projectUploadDir(project.id);
    fs.mkdirSync(dir, { recursive: true });
    const stored = `monthly-report-${crypto.randomUUID()}${path.extname(req.file.originalname).toLowerCase()}`;
    fs.writeFileSync(path.join(dir, stored), req.file.buffer);
    if (project.monthlyReportStoredFile) {
      fs.rmSync(storedWorkbookPath(project.id, project.monthlyReportStoredFile), { force: true });
    }
    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        monthlyReportStoredFile: stored,
        monthlyReportFileName: req.file.originalname,
        monthlyReportDriveId: null,
        monthlyReportItemId: null,
        monthlyReportWebUrl: null,
      },
    });
    const summary = await importWorkbook(project.id, project.name, parsed, req.user!);
    res.json({ workbook: workbookInfo(updated), ...summary });
  })
);

projectReportsRouter.delete(
  "/workbook",
  wrap(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (project.monthlyReportStoredFile) {
      fs.rmSync(storedWorkbookPath(project.id, project.monthlyReportStoredFile), { force: true });
    }
    await prisma.project.update({
      where: { id: project.id },
      data: {
        monthlyReportStoredFile: null,
        monthlyReportFileName: null,
        monthlyReportDriveId: null,
        monthlyReportItemId: null,
        monthlyReportWebUrl: null,
      },
    });
    res.status(204).send();
  })
);

// The workbook as it stands now (the dashboard's copy, or SharePoint's).
projectReportsRouter.get(
  "/workbook/download",
  wrap(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });
    let buffer: Buffer;
    if (project.monthlyReportDriveId && project.monthlyReportItemId) {
      buffer = (await downloadFile(req.user!.sub, project.monthlyReportDriveId, project.monthlyReportItemId)).buffer;
    } else if (project.monthlyReportStoredFile) {
      buffer = fs.readFileSync(storedWorkbookPath(project.id, project.monthlyReportStoredFile));
    } else {
      return res.status(404).json({ error: "No workbook linked to this project yet" });
    }
    const name = project.monthlyReportFileName || "Monthly Report.xlsm";
    res.setHeader("Content-Type", "application/vnd.ms-excel.sheet.macroEnabled.12");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
    res.send(buffer);
  })
);

projectReportsRouter.get(
  "/sharepoint/files",
  wrap(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });
    const files = await listReportFiles(req.user!.sub);
    const scored = files
      .map((f) => ({ ...f, score: matchScore(f.name, project) }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    res.json({ files: scored, suggestedItemId: scored[0]?.score >= 10 ? scored[0].itemId : null });
  })
);

projectReportsRouter.put(
  "/sharepoint/link",
  wrap(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });
    const { driveId, itemId } = req.body as { driveId?: string; itemId?: string };
    if (!driveId || !itemId) return res.status(400).json({ error: "Pick a workbook" });
    const file = await downloadFile(req.user!.sub, driveId, itemId);
    // Check it really is a monthly report before linking it.
    await readReportWorkbook(file.buffer);
    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        monthlyReportDriveId: driveId,
        monthlyReportItemId: itemId,
        monthlyReportFileName: file.name,
        monthlyReportWebUrl: file.webUrl,
      },
    });
    await logActivity({
      projectId: project.id,
      projectName: project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: `linked the monthly report workbook "${file.name}" in SharePoint`,
    });
    res.json(workbookInfo(updated));
  })
);

projectReportsRouter.post(
  "/sharepoint/pull",
  wrap(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (!project.monthlyReportDriveId || !project.monthlyReportItemId) {
      return res.status(400).json({ error: "Link this project's SharePoint workbook first" });
    }
    const file = await downloadFile(req.user!.sub, project.monthlyReportDriveId, project.monthlyReportItemId);
    const parsed = await readReportWorkbook(file.buffer);
    res.json(await importWorkbook(project.id, project.name, parsed, req.user!));
  })
);

// ---- /api/reports/:id --------------------------------------------------------------

export const reportsRouter = Router();

reportsRouter.get("/:id", async (req, res) => {
  const report = await prisma.monthlyReport.findUnique({ where: { id: req.params.id } });
  if (!report) return res.status(404).json({ error: "Report not found" });
  res.json(withContent(report));
});

// Re-run auto-fill for a saved month: the report's own content stands in
// for "last month", so the PM's commentary stays and project data refreshes.
reportsRouter.get(
  "/:id/refresh",
  wrap(async (req, res) => {
    const report = await prisma.monthlyReport.findUnique({ where: { id: req.params.id } });
    if (!report) return res.status(404).json({ error: "Report not found" });
    const loaded = await loadAutofillData(report.projectId);
    if (!loaded) return res.status(404).json({ error: "Project not found" });
    res.json({
      reportingMonth: monthKey(report.reportingMonth),
      ...buildAutofill(loaded.data, monthKey(report.reportingMonth), contentOf(report)),
    });
  })
);

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

  const body = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if (body.reportingMonth !== undefined) {
    const month = normalizeReportingMonth(body.reportingMonth);
    if (!month) {
      return res.status(400).json({ error: "A valid reporting month is required" });
    }
    data.reportingMonth = month;
  }
  if (body.content !== undefined) {
    const content = normalizeContent(body.content);
    Object.assign(data, legacyColumns(content), { content: content as unknown as Prisma.InputJsonValue });
  } else {
    const { projectPhase, currentStatus, recentlyCompleted, monthlyLookahead,
      budgetHealth, budgetComments, scheduleHealth, scheduleComments } = body;
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
    // Keep a content document (if there is one) in step with the short form.
    if (before.content) {
      const merged = { ...before, ...data } as MonthlyReport;
      const c = contentOf({ ...merged, content: null });
      const full = { ...contentOf(before), ...{
        projectPhase: c.projectPhase, currentStatus: c.currentStatus,
        recentlyCompleted: c.recentlyCompleted, monthlyLookahead: c.monthlyLookahead,
        budgetHealth: c.budgetHealth, budgetComments: c.budgetComments,
        scheduleHealth: c.scheduleHealth, scheduleComments: c.scheduleComments,
      } };
      data.content = full as unknown as Prisma.InputJsonValue;
    }
  }

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
    res.json(withContent(report));
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

// Write this month into the project's workbook — SharePoint's if linked,
// otherwise the dashboard's uploaded copy. `log: true` also records it on
// the Reporting Log tab, like the workbook's own "Log Monthly Report" macro.
reportsRouter.post(
  "/:id/sync",
  wrap(async (req, res) => {
    const report = await prisma.monthlyReport.findUnique({
      where: { id: req.params.id },
      include: { project: true },
    });
    if (!report) return res.status(404).json({ error: "Report not found" });
    if (!canModifyReport(report, req.user!)) {
      return res.status(403).json({ error: "Only the report's author or an admin can sync it" });
    }
    const project = report.project;
    const log = (req.body as { log?: boolean })?.log === true;
    const month = monthKey(report.reportingMonth);
    const content = contentOf(report);
    let target: "sharepoint" | "upload";
    let result;
    if (project.monthlyReportDriveId && project.monthlyReportItemId) {
      target = "sharepoint";
      const file = await downloadFile(req.user!.sub, project.monthlyReportDriveId, project.monthlyReportItemId);
      result = await writeReportWorkbook(file.buffer, month, content, { log });
      await uploadFile(req.user!.sub, project.monthlyReportDriveId, project.monthlyReportItemId, result.buffer, file.eTag);
    } else if (project.monthlyReportStoredFile) {
      target = "upload";
      const p = storedWorkbookPath(project.id, project.monthlyReportStoredFile);
      result = await writeReportWorkbook(fs.readFileSync(p), month, content, { log });
      fs.writeFileSync(p, result.buffer);
    } else {
      return res.status(400).json({ error: "Upload or link this project's monthly report workbook first" });
    }
    const updated = await prisma.monthlyReport.update({
      where: { id: report.id },
      data: { syncedAt: new Date(), ...(log ? { loggedAt: new Date() } : {}) },
    });
    await logActivity({
      projectId: project.id,
      projectName: project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: `wrote the ${formatReportMonth(report.reportingMonth)} monthly report to ${
        target === "sharepoint" ? "SharePoint" : "the workbook"}${log ? " and logged it" : ""}`,
    });
    res.json({
      target,
      cellsChanged: result.cellsChanged,
      logged: result.logged,
      report: withContent(updated),
    });
  })
);

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
