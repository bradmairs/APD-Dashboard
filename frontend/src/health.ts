import { CashFlowEntry, EotClaim, Project, RagStatus, Risk, Variation } from "./types";
import { STATUS_LABELS, STATUSES_EXEMPT_FROM_OVERDUE } from "./statusMeta";
import { formatCurrency, formatDate } from "./format";
import { forecastAtCompletion } from "./cashflow";
import { effectiveBudget } from "./variations";
import { revisedCompletionDate } from "./eot";
import { riskBand, riskScore } from "./riskScoring";

// A computed, always-up-to-date view of a project's health — distinct from
// the budgetHealth/scheduleHealth on a MonthlyReport, which are a PM's own
// manually-entered judgement call as of that reporting month. This rolls up
// live schedule, budget and risk data so a project needing attention shows
// up immediately rather than waiting for the next report.
export interface ProjectHealth {
  schedule: RagStatus;
  budget: RagStatus;
  risk: RagStatus;
  overall: RagStatus;
  // Plain-English basis for each rating, shown as a tooltip on the detailed
  // badge — the status alone doesn't say whether "Amber" means 3 days out
  // or 30, and a user shouldn't need to know the thresholds by heart.
  reasons: {
    schedule: string;
    budget: string;
    risk: string;
  };
}

const RAG_SEVERITY: Record<RagStatus, number> = { GREEN: 0, AMBER: 1, RED: 2 };

function worstOf(statuses: RagStatus[]): RagStatus {
  return statuses.reduce((worst, s) =>
    RAG_SEVERITY[s] > RAG_SEVERITY[worst] ? s : worst
  );
}

// Both schedule and budget health are read off the same percentage scale:
// GREEN below 95%, AMBER from 95% up to and including 115%, RED beyond
// 115%. AMBER deliberately straddles 100% — a project a little over its
// planned timeframe or budget isn't yet the same signal as one running
// materially over, which is what pushes it to RED.
const AMBER_THRESHOLD = 0.95;
const RED_THRESHOLD = 1.15;

function ragForPercentOf(actual: number, planned: number): RagStatus {
  const percent = actual / planned;
  if (percent > RED_THRESHOLD) return "RED";
  if (percent >= AMBER_THRESHOLD) return "AMBER";
  return "GREEN";
}

interface RagResult {
  status: RagStatus;
  reason: string;
}

// Uses the project's completion date as revised by any approved EOT
// claims, not the raw contractual date — the same reasoning budgetHealth
// uses effectiveBudget instead of the raw budget. This is deliberately
// different from statusMeta's isProjectOverdue (used by the dashboard's
// "Overdue" stat and the project table), which always reflects the
// original contractual date; Health is the exception-surfacing signal
// that should account for a schedule already agreed to be revised, while
// "Overdue" stays a literal reading of the contract.
//
// The percentage itself is elapsed time (project start to today) over the
// planned duration (project start to the effective target) — not a
// days-until-target countdown — so a short project and a long one are
// judged on the same scale relative to their own timeframe.
function scheduleHealth(project: Project, eotClaims: EotClaim[]): RagResult {
  const effectiveTarget = revisedCompletionDate(project, eotClaims);
  if (!effectiveTarget || !project.startDate) {
    return { status: "GREEN", reason: "No target completion date set." };
  }
  if (STATUSES_EXEMPT_FROM_OVERDUE.includes(project.status)) {
    return {
      status: "GREEN",
      reason: `Status is ${STATUS_LABELS[project.status]}, which isn't tracked against the target date.`,
    };
  }

  const start = new Date(project.startDate).getTime();
  const target = new Date(effectiveTarget).getTime();
  const plannedDuration = target - start;
  if (plannedDuration <= 0) {
    return { status: "GREEN", reason: "Planned timeframe is not set correctly." };
  }

  const elapsed = Date.now() - start;
  const pctElapsed = Math.round((elapsed / plannedDuration) * 100);
  const dateLabel = formatDate(effectiveTarget);
  return {
    status: ragForPercentOf(elapsed, plannedDuration),
    reason: `${pctElapsed}% of the planned timeframe elapsed, against a target completion of ${dateLabel}.`,
  };
}

function budgetHealth(
  project: Project,
  entries: CashFlowEntry[],
  variations: Variation[]
): RagResult {
  const budget = effectiveBudget(project, variations);
  if (budget === null || budget <= 0) {
    return { status: "GREEN", reason: "No approved budget set." };
  }
  if (entries.length === 0) {
    return { status: "GREEN", reason: "No cash flow entries recorded yet." };
  }

  const forecastTotal = forecastAtCompletion(entries);
  const pctOfBudget = Math.round((forecastTotal / budget) * 100);
  const budgetLabel =
    project.latestApprovedBudget !== null ? "latest approved budget" : "approved budget";
  return {
    status: ragForPercentOf(forecastTotal, budget),
    reason: `Forecast total ${formatCurrency(forecastTotal)} is ${pctOfBudget}% of the ${budgetLabel} (${formatCurrency(budget)}).`,
  };
}

function riskHealth(risks: Risk[]): RagResult {
  let worst: RagStatus = "GREEN";
  let critical = 0;
  let high = 0;
  let openCount = 0;
  for (const risk of risks) {
    if (risk.type !== "RISK" || risk.status === "CLOSED") continue;
    openCount += 1;
    const band = riskBand(riskScore(risk.inherentLikelihood, risk.inherentConsequence));
    if (band === "Critical") {
      critical += 1;
      worst = "RED";
    } else if (band === "High" && worst !== "RED") {
      high += 1;
      worst = "AMBER";
    }
  }

  if (critical > 0) {
    return {
      status: "RED",
      reason: `${critical} Critical-band risk${critical === 1 ? "" : "s"} open.`,
    };
  }
  if (high > 0) {
    return {
      status: "AMBER",
      reason: `${high} High-band risk${high === 1 ? "" : "s"} open.`,
    };
  }
  return {
    status: worst,
    reason:
      openCount === 0
        ? "No open risks logged."
        : `${openCount} open risk${openCount === 1 ? "" : "s"}, none rated High or Critical.`,
  };
}

export function computeProjectHealth(
  project: Project,
  entries: CashFlowEntry[],
  variations: Variation[],
  risks: Risk[],
  eotClaims: EotClaim[] = []
): ProjectHealth {
  const schedule = scheduleHealth(project, eotClaims);
  const budget = budgetHealth(project, entries, variations);
  const risk = riskHealth(risks);
  return {
    schedule: schedule.status,
    budget: budget.status,
    risk: risk.status,
    overall: worstOf([schedule.status, budget.status, risk.status]),
    reasons: { schedule: schedule.reason, budget: budget.reason, risk: risk.reason },
  };
}
