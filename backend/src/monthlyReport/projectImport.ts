import { prisma } from "../prisma";
import { logActivity } from "../activityLog";
import { MonthlyReportContent } from "./model";

// 3.1: "Also update the project from this workbook". Takes the current
// month's Monthly Report tab and copies its cash flow and schedule into the
// project's own registers:
//   - Cash flow: the July-June months of this and next financial year.
//     Months up to the report month are actuals, later months forecasts
//     (the same split the sheet uses when it's filled from the dashboard).
//   - Milestones: matched by task name; new ones are added.
//   - The approved completion date sets the project's Approved Completion
//     Target.
// Without "overwrite", only blanks are filled in: existing amounts, dates
// and percentages are left as they are.

export interface ProjectImportSummary {
  cashFlow: { created: number; updated: number; skipped: number };
  milestones: { created: number; updated: number; skipped: number };
  approvedCompletion: "set" | "kept" | "none";
}

function monthDate(year: number, month1to12: number) {
  return new Date(Date.UTC(year, month1to12 - 1, 1));
}

function isoDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const d = new Date(`${value.substring(0, 10)}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

// The (year, month) of each slot in currentFyMonths / nextFyMonths.
export function fyMonthSlots(reportingMonth: string) {
  const [y, m] = reportingMonth.split("-").map(Number);
  const fyStart = m >= 7 ? y : y - 1;
  const reportIndex = (m + 5) % 12; // July = 0
  const slot = (fy: number, i: number) => {
    const month = ((6 + i) % 12) + 1; // 7..12, 1..6
    return { year: month >= 7 ? fy : fy + 1, month };
  };
  return {
    current: Array.from({ length: 12 }, (_, i) => ({ ...slot(fyStart, i), actual: i <= reportIndex })),
    next: Array.from({ length: 12 }, (_, i) => ({ ...slot(fyStart + 1, i), actual: false })),
  };
}

export async function importProjectData(opts: {
  projectId: string;
  projectName: string;
  reportingMonth: string;
  content: MonthlyReportContent;
  overwrite: boolean;
  user: { sub: string; name: string };
}): Promise<ProjectImportSummary> {
  const { projectId, content, overwrite } = opts;
  const summary: ProjectImportSummary = {
    cashFlow: { created: 0, updated: 0, skipped: 0 },
    milestones: { created: 0, updated: 0, skipped: 0 },
    approvedCompletion: "none",
  };

  // ---- Cash flow ----
  const slots = fyMonthSlots(opts.reportingMonth);
  const values = [
    ...slots.current.map((s, i) => ({ ...s, amount: content.currentFyMonths[i] })),
    ...slots.next.map((s, i) => ({ ...s, amount: content.nextFyMonths[i] })),
  ];
  for (const v of values) {
    if (v.amount === null || v.amount === undefined || v.amount === 0) continue;
    const month = monthDate(v.year, v.month);
    const type = v.actual ? "ACTUAL" : "FORECAST";
    const existing = await prisma.cashFlowEntry.findUnique({
      where: { projectId_month_type: { projectId, month, type } },
    });
    if (!existing) {
      await prisma.cashFlowEntry.create({ data: { projectId, month, type, amount: v.amount } });
      summary.cashFlow.created++;
    } else if (overwrite && Number(existing.amount) !== v.amount) {
      await prisma.cashFlowEntry.update({ where: { id: existing.id }, data: { amount: v.amount } });
      summary.cashFlow.updated++;
    } else {
      summary.cashFlow.skipped++;
    }
  }

  // ---- Milestones ----
  const current = await prisma.milestone.findMany({ where: { projectId }, orderBy: { sortOrder: "asc" } });
  const byTask = new Map(current.map((m) => [m.taskActivity.trim().toLowerCase(), m]));
  let nextOrder = (current[current.length - 1]?.sortOrder ?? -1) + 1;
  for (const line of content.milestones) {
    const task = line.task.trim();
    if (!task || task === "-") continue;
    const original = isoDate(line.original);
    const forecast = isoDate(line.forecast);
    const percent = line.percent === null ? null : Math.max(0, Math.min(100, Math.round(line.percent)));
    const found = byTask.get(task.toLowerCase());
    if (!found) {
      await prisma.milestone.create({
        data: {
          projectId,
          taskActivity: task,
          wbsItem: line.wbs && line.wbs !== "-" ? line.wbs : null,
          percentComplete: percent ?? 0,
          originalCompletion: original,
          forecastedCompletion: forecast,
          notes: line.notes && line.notes !== "-" ? line.notes : null,
          sortOrder: nextOrder++,
        },
      });
      summary.milestones.created++;
      continue;
    }
    const data: Record<string, unknown> = {};
    const take = (field: string, incoming: unknown, existing: unknown) => {
      if (incoming === null || incoming === undefined) return;
      const same =
        incoming instanceof Date && existing instanceof Date
          ? incoming.getTime() === existing.getTime()
          : incoming === existing;
      if (same) return;
      if (overwrite || existing === null || existing === undefined || (field === "percentComplete" && existing === 0)) {
        data[field] = incoming;
      }
    };
    take("percentComplete", percent, found.percentComplete);
    take("originalCompletion", original, found.originalCompletion);
    take("forecastedCompletion", forecast, found.forecastedCompletion);
    if (Object.keys(data).length) {
      await prisma.milestone.update({ where: { id: found.id }, data });
      summary.milestones.updated++;
    } else {
      summary.milestones.skipped++;
    }
  }

  // ---- Approved completion target ----
  const approved = isoDate(content.completion.approved);
  if (approved) {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { targetCompletionDate: true } });
    if (!project?.targetCompletionDate || (overwrite && project.targetCompletionDate.getTime() !== approved.getTime())) {
      await prisma.project.update({ where: { id: projectId }, data: { targetCompletionDate: approved } });
      summary.approvedCompletion = "set";
    } else {
      summary.approvedCompletion = "kept";
    }
  }

  const changed =
    summary.cashFlow.created + summary.cashFlow.updated + summary.milestones.created + summary.milestones.updated;
  if (changed || summary.approvedCompletion === "set") {
    await logActivity({
      projectId,
      projectName: opts.projectName,
      userId: opts.user.sub,
      userName: opts.user.name,
      action:
        `updated the project from the monthly report workbook (${opts.reportingMonth}${overwrite ? ", overwriting" : ""}): ` +
        `${summary.cashFlow.created + summary.cashFlow.updated} cash flow month(s), ` +
        `${summary.milestones.created + summary.milestones.updated} milestone(s)` +
        (summary.approvedCompletion === "set" ? ", approved completion target" : ""),
    });
  }
  return summary;
}
