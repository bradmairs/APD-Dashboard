import { CashFlowEntry, Project, Variation } from "../types";
import { formatCurrency } from "../format";
import { effectiveBudget } from "../variations";
import { BUDGET_LATEST_APPROVED, CHART_TEXT_MUTED } from "./palette";
import CumulativeSpendChartView, { BudgetLine } from "./CumulativeSpendChartView";
import {
  buildCumulativeSeries,
  buildMonthRange,
  lastActualMonth,
  monthLabel,
  monthlyContributions,
  toMonthKey,
} from "./cumulativeSpend";

interface Props {
  project: Project;
  entries: CashFlowEntry[];
  variations?: Variation[];
}

// A budget "S-curve": cumulative spend (Actual, then continuing as
// Forecast) plotted against up to two flat reference lines — the Original
// Budget (grey, as set at project setup) and the Latest Approved Budget
// (green, tracked separately since not every revision is raised as a
// Variation) — over the project's own start-to-target-completion
// timeframe. When no Latest Approved Budget has been entered yet, this
// falls back to the variations-derived revised budget so an approved
// scope change still shows up as a second line until the field is filled
// in directly.
export default function CumulativeSpendChart({
  project,
  entries,
  variations = [],
}: Props) {
  const entryMonths = entries.map((e) => e.month).sort();
  const starts = [project.startDate, entryMonths[0]]
    .filter((v): v is string => !!v)
    .map(toMonthKey)
    .sort();
  const ends = [project.targetCompletionDate, entryMonths[entryMonths.length - 1]]
    .filter((v): v is string => !!v)
    .map(toMonthKey)
    .sort();

  if (starts.length === 0 || ends.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
        Add a start/target completion date or a cash flow entry to see spend
        over time.
      </p>
    );
  }

  const rangeStart = starts[0];
  const rangeEnd = ends[ends.length - 1];
  const months = buildMonthRange(rangeStart, rangeEnd);
  const { cumulative, lastActualIndex } = buildCumulativeSeries(
    months,
    monthlyContributions(entries),
    lastActualMonth(entries)
  );

  const originalBudget = project.budget !== null ? Number(project.budget) : null;
  const latestApprovedBudget = effectiveBudget(project, variations);

  const budgetLines: BudgetLine[] = [];
  if (originalBudget !== null) {
    budgetLines.push({
      value: originalBudget,
      label: "Original Budget",
      color: CHART_TEXT_MUTED,
    });
  }
  if (latestApprovedBudget !== null && latestApprovedBudget !== originalBudget) {
    budgetLines.push({
      value: latestApprovedBudget,
      label: "Latest Approved Budget",
      color: BUDGET_LATEST_APPROVED,
    });
  }

  return (
    <CumulativeSpendChartView
      months={months}
      cumulative={cumulative}
      lastActualIndex={lastActualIndex}
      budgetLines={budgetLines}
      footerNote={`Cumulative spend from ${monthLabel(rangeStart)} to ${monthLabel(
        rangeEnd
      )}${
        originalBudget !== null
          ? `, against an original budget of ${formatCurrency(originalBudget)}`
          : ""
      }${
        latestApprovedBudget !== null && latestApprovedBudget !== originalBudget
          ? ` and a latest approved budget of ${formatCurrency(latestApprovedBudget)}`
          : ""
      }.`}
    />
  );
}
