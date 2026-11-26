import { CashFlowEntry, ContractRecord, Project, Variation } from "../types";
import { approvedVariationsTotal, effectiveBudget } from "../variations";
import { formatCurrency } from "../format";
import { Icon } from "./icons";

interface Props {
  project: Project;
  cashFlowEntries: CashFlowEntry[];
  variations: Variation[];
  contracts: ContractRecord[];
}

function monthKey(iso: string) {
  return iso.substring(0, 7);
}

// Where the money is heading: forecast final cost (actual spend so far plus
// the forecast for the months after the last actual), the variance against
// the approved budget, the recent monthly burn rate, and how much
// contingency the approved variations have used.
export default function CostForecastCard({ project, cashFlowEntries, variations, contracts }: Props) {
  const actuals = cashFlowEntries.filter((e) => e.type === "ACTUAL");
  const forecasts = cashFlowEntries.filter((e) => e.type === "FORECAST");
  const spent = actuals.reduce((s, e) => s + Number(e.amount || 0), 0);
  const lastActual = actuals.map((e) => monthKey(e.month)).sort().pop() ?? "";
  const remaining = forecasts.filter((e) => monthKey(e.month) > lastActual).reduce((s, e) => s + Number(e.amount || 0), 0);
  const eac = spent + remaining;
  const budget = effectiveBudget(project, variations);
  // No spend or forecast yet: nothing to compare.
  const variance = budget !== null && eac > 0 ? budget - eac : null;

  // Burn: average actual spend over the latest three months that had any.
  const byMonth = new Map<string, number>();
  for (const e of actuals) byMonth.set(monthKey(e.month), (byMonth.get(monthKey(e.month)) ?? 0) + Number(e.amount || 0));
  const recent = Array.from(byMonth.entries()).sort(([a], [b]) => b.localeCompare(a)).slice(0, 3);
  const burn = recent.length ? recent.reduce((s, [, v]) => s + v, 0) / recent.length : null;
  const monthsLeft = burn && budget !== null && burn > 0 ? Math.max(0, (budget - spent) / burn) : null;

  const contingency =
    project.contingency != null && project.contingency !== ""
      ? Number(project.contingency)
      : contracts.reduce((s, c) => s + Number(c.contingency || 0), 0) || null;
  const variationsUsed = approvedVariationsTotal(variations);
  const contingencyLeft = contingency !== null ? contingency - variationsUsed : null;

  const tiles = [
    {
      label: "Forecast final cost",
      value: eac > 0 ? formatCurrency(eac) : "—",
      detail: `${formatCurrency(spent)} spent + ${formatCurrency(remaining)} still forecast`,
      icon: "target",
      tone: "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/15",
    },
    {
      label: "Variance to budget",
      value: variance === null ? "—" : `${variance < 0 ? "−" : "+"}${formatCurrency(Math.abs(variance))}`,
      detail: variance === null ? (budget === null ? "Set a budget" : "Add a cash flow forecast") : variance < 0 ? `Over ${formatCurrency(budget)}` : `Under ${formatCurrency(budget)}`,
      icon: variance !== null && variance < 0 ? "trendDown" : "trendUp",
      tone:
        variance !== null && variance < 0
          ? "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/15"
          : "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15",
    },
    {
      label: "Monthly burn",
      value: burn ? formatCurrency(burn) : "—",
      detail: burn
        ? monthsLeft !== null
          ? `About ${monthsLeft.toFixed(monthsLeft < 10 ? 1 : 0)} months of budget left at this rate`
          : `Average of the last ${recent.length} months`
        : "No actual spend recorded",
      icon: "activity",
      tone: "text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/15",
    },
    {
      label: "Contingency left",
      value: contingencyLeft === null ? "—" : formatCurrency(contingencyLeft),
      detail:
        contingency === null
          ? "Add contingency on the project or its contracts"
          : `${formatCurrency(variationsUsed)} of ${formatCurrency(contingency)} used by approved variations`,
      icon: "shield",
      tone:
        contingencyLeft !== null && contingencyLeft < 0
          ? "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/15"
          : "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15",
    },
  ];

  return (
    <section className="card p-4" aria-labelledby="cost-forecast-heading">
      <h3 id="cost-forecast-heading" className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
        Cost forecast
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-slate-100 dark:border-slate-800 p-3 flex gap-3">
            <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${t.tone}`}>
              <Icon name={t.icon} className="w-[18px] h-[18px]" />
            </span>
            <div className="min-w-0">
              <div className="text-xs text-slate-500 dark:text-slate-400">{t.label}</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 leading-tight">{t.value}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
