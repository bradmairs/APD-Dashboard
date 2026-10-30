import { stripFormatting } from "../plainText";
import {
  FY_MONTH_NAMES,
  Health,
  MILESTONE_ROWS,
  MonthlyReportContent,
  PHASE_STATUSES,
  RISK_CATEGORIES,
  emptyContent,
  fiscalIndex,
  fyStartYear,
  normalizeContent,
  parseMonth,
} from "./model";

// Builds a month's report from what the dashboard already knows about the
// project. Anything the dashboard doesn't track (titles, document numbers,
// a PM's commentary) is carried forward from the previous month's report,
// the same way a PM rolls the spreadsheet on by editing last month's copy.

export interface AutofillProject {
  name: string;
  status: string;
  bpRefNo: string | null;
  projectNumber: string | null;
  projectManager: string | null;
  projectDirector: string | null;
  projectSponsor: string | null;
  budget: number | null;
  latestApprovedBudget: number | null;
  startDate: Date | null;
  targetCompletionDate: Date | null;
  actualCompletionDate: Date | null;
}

export interface AutofillData {
  project: AutofillProject;
  milestones: {
    wbsItem: string | null;
    taskActivity: string;
    percentComplete: number;
    originalCompletion: Date | null;
    forecastedCompletion: Date | null;
    actualCompletion: Date | null;
    notes: string | null;
  }[];
  cashFlow: { month: Date; type: "ACTUAL" | "FORECAST"; amount: number }[];
  risks: {
    type: string;
    title: string;
    category: string | null;
    status: string;
    inherentLikelihood: string;
    inherentConsequence: string;
    residualLikelihood: string | null;
    residualConsequence: string | null;
  }[];
  tasks: { title: string; status: string; dueDate: Date | null; updatedAt: Date }[];
}

export interface AutofillResult {
  content: MonthlyReportContent;
  // Content keys (dot paths for nested ones) taken from dashboard data this
  // time, so the sheet can show which cells came from the project.
  autoFields: string[];
}

const PHASE_BY_STATUS: Record<string, string> = {
  PLANNING: "3 - Plan",
  DESIGN: "3 - Plan",
  TENDER: "4 - Procurement",
  CONSTRUCTION: "5 - Implementation",
  PROJECT_COMPLETION: "5 - Implementation",
  DEFECTS_LIABILITY: "6 - Close",
  COMPLETE: "6 - Close",
  ON_HOLD: "On Hold",
  CANCELLED: "6 - Close",
};

const LIKELIHOOD: Record<string, number> = { RARE: 1, UNLIKELY: 2, POSSIBLE: 3, LIKELY: 4, ALMOST_CERTAIN: 5 };
const CONSEQUENCE: Record<string, number> = { INSIGNIFICANT: 1, MINOR: 2, MODERATE: 3, MAJOR: 4, SEVERE: 5 };

// Same banding as frontend/src/riskScoring.ts: Low -> Green, Medium ->
// Yellow, High/Critical -> Red.
function riskHealth(r: AutofillData["risks"][number]): Health {
  const l = LIKELIHOOD[r.residualLikelihood ?? r.inherentLikelihood] ?? 1;
  const c = CONSEQUENCE[r.residualConsequence ?? r.inherentConsequence] ?? 1;
  const score = l * c;
  return score >= 10 ? "Red" : score >= 5 ? "Yellow" : "Green";
}

const RANK: Record<Health, number> = { "": 0, Green: 1, Yellow: 2, Red: 3 };

function iso(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

function ddmmyyyy(d: Date): string {
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

function addMonths(reportingMonth: string, delta: number): string {
  const { year, month } = parseMonth(reportingMonth);
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return monthKey(d);
}

function inMonth(d: Date | null, reportingMonth: string): boolean {
  return !!d && monthKey(d) === reportingMonth;
}

export function buildAutofill(
  data: AutofillData,
  reportingMonth: string,
  previous: MonthlyReportContent | null
): AutofillResult {
  const content = previous ? normalizeContent(structuredClone(previous)) : emptyContent();
  const auto: string[] = [];
  const set = <K extends keyof MonthlyReportContent>(key: K, value: MonthlyReportContent[K] | null | undefined) => {
    if (value === null || value === undefined || value === "") return;
    content[key] = value;
    auto.push(key);
  };
  const p = data.project;

  // Project information
  set("projectName", p.name);
  set("bpRefNo", p.bpRefNo ?? undefined);
  set("projectManager", p.projectManager ?? undefined);
  set("projectDirector", p.projectDirector ?? undefined);
  set("projectSponsor", p.projectSponsor ?? undefined);

  // Current status
  const phase = PHASE_BY_STATUS[p.status];
  if (phase && phase !== content.projectPhase) {
    set("projectPhase", phase);
    // The old status may not belong to the new phase.
    if (!PHASE_STATUSES[phase].includes(content.currentStatus)) content.currentStatus = "";
  } else if (phase) {
    auto.push("projectPhase");
  }
  const sortedMilestones = data.milestones;
  const current = sortedMilestones.find((m) => m.percentComplete < 100 && !m.actualCompletion);
  const statuses = PHASE_STATUSES[content.projectPhase] ?? [];
  const statusFromMilestone = current
    ? statuses.find((s) => s.toLowerCase() === current.taskActivity.trim().toLowerCase())
    : undefined;
  if (statusFromMilestone) set("currentStatus", statusFromMilestone);
  else if (!content.currentStatus && statuses.length === 1) set("currentStatus", statuses[0]);

  const completedLines = [
    ...sortedMilestones
      .filter((m) => inMonth(m.actualCompletion, reportingMonth))
      .map((m) => `•${m.taskActivity} completed on ${ddmmyyyy(m.actualCompletion!)}.`),
    ...data.tasks
      .filter((t) => t.status === "DONE" && inMonth(t.updatedAt, reportingMonth))
      .map((t) => `•${t.title}.`),
  ];
  if (completedLines.length) set("recentlyCompleted", completedLines.join("\n"));

  const nextMonth = addMonths(reportingMonth, 1);
  const lookaheadLines = [
    ...sortedMilestones
      .filter((m) => !m.actualCompletion && (inMonth(m.forecastedCompletion, nextMonth) || m === current))
      .map((m) =>
        m.forecastedCompletion && inMonth(m.forecastedCompletion, nextMonth)
          ? `•${m.taskActivity} forecast to complete by ${ddmmyyyy(m.forecastedCompletion)}.`
          : `•Continue ${m.taskActivity} (${m.percentComplete}% complete).`
      ),
    ...data.tasks
      .filter((t) => t.status !== "DONE" && t.dueDate && (inMonth(t.dueDate, nextMonth) || inMonth(t.dueDate, reportingMonth)))
      .map((t) => `•${t.title}${t.dueDate ? ` (due ${ddmmyyyy(t.dueDate)})` : ""}.`),
  ];
  if (lookaheadLines.length) set("monthlyLookahead", lookaheadLines.join("\n"));

  // Emerging risks: the risk register is authoritative once it has any
  // categorised risks; a category with none open is Green.
  const openRisks = data.risks.filter((r) => r.type === "RISK" && r.status !== "CLOSED");
  const categorised = data.risks.some((r) => r.type === "RISK" && r.category &&
    RISK_CATEGORIES.some((c) => c.toLowerCase() === r.category!.trim().toLowerCase()));
  if (categorised) {
    content.risks = RISK_CATEGORIES.map((category) => {
      const matching = openRisks.filter((r) => r.category?.trim().toLowerCase() === category.toLowerCase());
      if (!matching.length) return { category, health: "Green" as Health, comments: "-" };
      const worst = matching.reduce<Health>((acc, r) => {
        const h = riskHealth(r);
        return RANK[h] > RANK[acc] ? h : acc;
      }, "Green");
      return { category, health: worst, comments: matching.map((r) => r.title).join("; ") };
    });
    auto.push("risks");
  }

  // Budget
  set("originalBudget", p.budget);
  set("approvedBudget", p.latestApprovedBudget ?? p.budget);

  // Cash flow: a month's actual wins over its forecast.
  if (data.cashFlow.length) {
    const byMonth = new Map<string, { actual?: number; forecast?: number }>();
    for (const e of data.cashFlow) {
      const k = monthKey(e.month);
      const slot = byMonth.get(k) ?? {};
      if (e.type === "ACTUAL") slot.actual = (slot.actual ?? 0) + e.amount;
      else slot.forecast = (slot.forecast ?? 0) + e.amount;
      byMonth.set(k, slot);
    }
    const fy = fyStartYear(reportingMonth);
    const idx = fiscalIndex(reportingMonth);
    const fyOf = (k: string) => fyStartYear(k);
    const amountFor = (k: string, preferActual: boolean) => {
      const s = byMonth.get(k);
      if (!s) return null;
      return preferActual ? s.actual ?? s.forecast ?? null : s.forecast ?? s.actual ?? null;
    };
    const fyMonthKey = (startYear: number, i: number) => {
      const calMonth = ((i + 6) % 12) + 1;
      const year = calMonth >= 7 ? startYear : startYear + 1;
      return `${year}-${String(calMonth).padStart(2, "0")}`;
    };
    content.currentFyMonths = FY_MONTH_NAMES.map((_, i) => amountFor(fyMonthKey(fy, i), i <= idx) ?? 0);
    content.nextFyMonths = FY_MONTH_NAMES.map((_, i) => amountFor(fyMonthKey(fy + 1, i), false) ?? 0);
    let pre = 0, plus2 = 0, plus3 = 0, post = 0;
    for (const [k, s] of byMonth) {
      const y = fyOf(k);
      if (y < fy) pre += s.actual ?? 0;
      else if (y === fy + 2) plus2 += s.actual ?? s.forecast ?? 0;
      else if (y === fy + 3) plus3 += s.actual ?? s.forecast ?? 0;
      else if (y > fy + 3) post += s.actual ?? s.forecast ?? 0;
    }
    content.preFyActual = pre;
    content.fy2Forecast = plus2;
    content.fy3Forecast = plus3;
    content.postFyForecast = post;
    auto.push("currentFyMonths", "nextFyMonths", "preFyActual", "fy2Forecast", "fy3Forecast", "postFyForecast");
  }

  // Schedule: the template's six WBS rows come from the Milestones register.
  if (sortedMilestones.length) {
    const prevByTask = new Map(content.milestones.map((m) => [m.task.trim().toLowerCase(), m]));
    content.milestones = Array.from({ length: MILESTONE_ROWS }, (_, i) => {
      const m = sortedMilestones[i];
      if (!m) return { wbs: String(i + 1), task: "", percent: null, original: null, approved: null, forecast: null, notes: "" };
      const prev = prevByTask.get(m.taskActivity.trim().toLowerCase());
      return {
        wbs: m.wbsItem || String(i + 1),
        task: m.taskActivity,
        percent: m.percentComplete,
        original: iso(m.originalCompletion) ?? prev?.original ?? null,
        // The dashboard has no separate "current approved" date per
        // milestone; keep the PM's last one, defaulting to the original.
        approved: prev?.approved ?? iso(m.originalCompletion),
        forecast: iso(m.actualCompletion ?? m.forecastedCompletion) ?? prev?.forecast ?? null,
        notes: (m.notes && stripFormatting(m.notes)) || prev?.notes || "-",
      };
    });
    auto.push("milestones");
  }
  const lastForecast = [...sortedMilestones]
    .map((m) => m.actualCompletion ?? m.forecastedCompletion)
    .filter((d): d is Date => !!d)
    .sort((a, b) => a.getTime() - b.getTime())
    .pop();
  const completionForecast = p.actualCompletionDate ?? lastForecast ?? null;
  if (p.targetCompletionDate) {
    content.completion.approved = iso(p.targetCompletionDate);
    if (!content.completion.original) content.completion.original = iso(p.targetCompletionDate);
    auto.push("completion.approved");
  }
  if (completionForecast) {
    content.completion.forecast = iso(completionForecast);
    auto.push("completion.forecast");
  }
  if (!content.dateApdReceived && p.startDate) {
    content.dateApdReceived = iso(p.startDate);
    auto.push("dateApdReceived");
  }

  // A first report has no previous health judgement to carry; suggest one.
  if (!previous) {
    const fyTotal = content.currentFyMonths.reduce<number>((s, v) => s + (v ?? 0), 0);
    content.budgetHealth = content.approvedBudget !== null && fyTotal > 0 &&
      (content.preFyActual ?? 0) + fyTotal > content.approvedBudget ? "Red" : "Green";
    const late = completionForecast && p.targetCompletionDate && completionForecast > p.targetCompletionDate;
    content.scheduleHealth = late ? "Yellow" : "Green";
  }

  return { content, autoFields: [...new Set(auto)] };
}
