import { CashFlowEntry, Project, Variation } from "../types";
import { formatCurrency } from "../format";
import { effectiveBudget } from "../variations";
import { BUDGET_LATEST_APPROVED, CHART_TEXT_MUTED } from "./palette";
import CumulativeSpendChartView, { BudgetLine } from "./CumulativeSpendChartView";
import {
  buildCumulativeSeries,
  buildMonthRange,
  monthLabel,
  monthlyContributions,
  sumContributions,
  toMonthKey,
} from "./cumulativeSpend";

interface Props {
  projects: Project[];
  entries: CashFlowEntry[];
  variations?: Variation[];
}

// The portfolio-wide version of each project's own Spend vs Budget Over Time
// chart: one project's contribution for a month is its own actual amount
// once recorded, falling back to its own forecast — never another project's
// — so each project's series is built independently first and only then
// summed, rather than pooling every project's raw entries into one bucket
// (which would let one project's actual silently swallow another's still-
// forecast month).
export default function PortfolioCumulativeSpendChart({
  projects,
  entries,
  variations = [],
}: Props) {
  const entriesByProject = new Map<string, CashFlowEntry[]>();
  for (const entry of entries) {
    const list = entriesByProject.get(entry.projectId) ?? [];
    list.push(entry);
    entriesByProject.set(entry.projectId, list);
  }

  const variationsByProject = new Map<string, Variation[]>();
  for (const variation of variations) {
    const list = variationsByProject.get(variation.projectId) ?? [];
    list.push(variation);
    variationsByProject.set(variation.projectId, list);
  }

  const allMonths = entries.map((e) => e.month);
  const starts = [...projects.map((p) => p.startDate), ...allMonths]
    .filter((v): v is string => !!v)
    .map(toMonthKey)
    .sort();
  const ends = [...projects.map((p) => p.targetCompletionDate), ...allMonths]
    .filter((v): v is string => !!v)
    .map(toMonthKey)
    .sort();

  if (starts.length === 0 || ends.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
        Add project start/target completion dates or cash flow entries to see
        portfolio spend over time.
      </p>
    );
  }

  const rangeStart = starts[0];
  const rangeEnd = ends[ends.length - 1];
  const months = buildMonthRange(rangeStart, rangeEnd);

  const perProjectContributions = projects.map((project) =>
    monthlyContributions(entriesByProject.get(project.id) ?? [])
  );
  const combinedContributions = sumContributions(perProjectContributions);

  // The portfolio's Actual/Forecast split: the latest month in which *any*
  // project recorded an actual, since a single combined line can't show
  // each project's own frontier separately.
  const lastActual = entries
    .filter((e) => e.type === "ACTUAL")
    .map((e) => e.month)
    .sort()
    .slice(-1)[0] as string | undefined;

  const { cumulative, lastActualIndex } = buildCumulativeSeries(
    months,
    combinedContributions,
    lastActual ?? null
  );

  const originalBudgets = projects
    .map((p) => (p.budget !== null ? Number(p.budget) : null))
    .filter((b): b is number => b !== null);
  const totalOriginalBudget =
    originalBudgets.length === 0 ? null : originalBudgets.reduce((sum, b) => sum + b, 0);

  const latestApprovedBudgets = projects
    .map((p) => effectiveBudget(p, variationsByProject.get(p.id) ?? []))
    .filter((b): b is number => b !== null);
  const totalLatestApprovedBudget =
    latestApprovedBudgets.length === 0
      ? null
      : latestApprovedBudgets.reduce((sum, b) => sum + b, 0);

  const budgetLines: BudgetLine[] = [];
  if (totalOriginalBudget !== null) {
    budgetLines.push({
      value: totalOriginalBudget,
      label: "Total Original Budget",
      color: CHART_TEXT_MUTED,
    });
  }
  if (
    totalLatestApprovedBudget !== null &&
    totalLatestApprovedBudget !== totalOriginalBudget
  ) {
    budgetLines.push({
      value: totalLatestApprovedBudget,
      label: "Total Latest Approved Budget",
      color: BUDGET_LATEST_APPROVED,
    });
  }

  return (
    <CumulativeSpendChartView
      months={months}
      cumulative={cumulative}
      lastActualIndex={lastActualIndex}
      budgetLines={budgetLines}
      footerNote={`Cumulative spend across ${projects.length} project${
        projects.length === 1 ? "" : "s"
      } from ${monthLabel(rangeStart)} to ${monthLabel(rangeEnd)}${
        totalOriginalBudget !== null
          ? `, against a total original budget of ${formatCurrency(totalOriginalBudget)}`
          : ""
      }${
        totalLatestApprovedBudget !== null &&
        totalLatestApprovedBudget !== totalOriginalBudget
          ? ` and a total latest approved budget of ${formatCurrency(totalLatestApprovedBudget)}`
          : ""
      }.`}
    />
  );
}
