import { ReactNode } from "react";
import { CashFlowEntry, Project, Variation } from "../types";
import { isProjectOverdue } from "../statusMeta";
import { formatCurrency } from "../format";
import { effectiveBudget } from "../variations";
import { Icon } from "./icons";
import Sparkline, { SparkPoint } from "./Sparkline";

const MONTHS = 12;

function lastMonths(): { label: string; end: Date }[] {
  const now = new Date();
  return Array.from({ length: MONTHS }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1 - i), 1);
    return {
      label: d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" }),
      end: new Date(d.getFullYear(), d.getMonth() + 1, 1),
    };
  });
}

function compactCurrency(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return formatCurrency(v);
}

interface Tile {
  key: "total" | "inConstruction" | "overdue" | "budget";
  label: string;
  value: ReactNode;
  icon: string;
  tone: string;
  delta?: { text: string; good?: boolean | null };
  trend?: { points: SparkPoint[]; format: (v: number) => string; label: string };
  alert?: boolean;
}

// The dashboard's headline numbers: an icon, the figure, what changed
// recently, and (where there's history) a 12-month trend line.
export default function StatCards({
  projects,
  variations,
  cashFlowEntries = [],
  onSelect,
}: {
  projects: Project[];
  variations: Variation[];
  cashFlowEntries?: CashFlowEntry[];
  onSelect?: Partial<Record<Tile["key"], () => void>>;
}) {
  const months = lastMonths();
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  const total = projects.length;
  const newThisMonth = projects.filter((p) => new Date(p.createdAt) >= monthAgo).length;
  const inConstruction = projects.filter((p) => p.status === "CONSTRUCTION").length;
  const overdue = projects.filter(isProjectOverdue).length;

  const variationsByProject = new Map<string, Variation[]>();
  for (const v of variations) {
    const list = variationsByProject.get(v.projectId);
    if (list) list.push(v);
    else variationsByProject.set(v.projectId, [v]);
  }
  // The Latest Approved Budget when a project has one, since it already
  // reflects every negotiated change; otherwise the Original Budget as
  // revised by approved Variations — see variations.ts's effectiveBudget,
  // the same figure Project Health and the Cumulative Spend charts use.
  const totalApprovedBudget = projects.reduce(
    (sum, p) => sum + (effectiveBudget(p, variationsByProject.get(p.id) ?? []) ?? 0),
    0
  );

  const actuals = cashFlowEntries.filter((e) => e.type === "ACTUAL");
  const spentToDate = actuals.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const spentPct = totalApprovedBudget > 0 ? Math.round((spentToDate / totalApprovedBudget) * 100) : null;

  const projectTrend = months.map((m) => ({
    label: m.label,
    value: projects.filter((p) => new Date(p.createdAt) < m.end).length,
  }));
  const spendTrend = months.map((m) => ({
    label: m.label,
    value: actuals.filter((e) => new Date(e.month) < m.end).reduce((s, e) => s + Number(e.amount || 0), 0),
  }));

  const tiles: Tile[] = [
    {
      key: "total",
      label: "Total projects",
      value: total,
      icon: "layers",
      tone: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
      delta: newThisMonth > 0 ? { text: `+${newThisMonth} in the last 30 days`, good: null } : { text: "No new projects this month" },
      trend: { points: projectTrend, format: (v) => String(v), label: "Projects, last 12 months" },
    },
    {
      key: "inConstruction",
      label: "In construction",
      value: inConstruction,
      icon: "hardhat",
      tone: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
      delta: { text: total > 0 ? `${Math.round((inConstruction / total) * 100)}% of the portfolio` : "—" },
    },
    {
      key: "overdue",
      label: "Overdue",
      value: overdue,
      icon: "alert",
      tone: overdue > 0
        ? "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300"
        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
      delta: overdue > 0 ? { text: "Past target completion", good: false } : { text: "All on track", good: true },
      alert: overdue > 0,
    },
    {
      key: "budget",
      label: "Total approved budget",
      value: compactCurrency(totalApprovedBudget),
      icon: "dollar",
      tone: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
      delta: { text: spentPct !== null ? `${compactCurrency(spentToDate)} spent (${spentPct}%)` : "No spend recorded" },
      trend: spentToDate > 0 ? { points: spendTrend, format: compactCurrency, label: "Actual spend to date, last 12 months" } : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {tiles.map((t) => {
        const select = onSelect?.[t.key];
        const body = (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-slate-500 dark:text-slate-400">{t.label}</div>
                <div
                  className={`text-3xl font-semibold tracking-tight mt-1 ${
                    t.alert ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-50"
                  }`}
                  title={t.key === "budget" ? formatCurrency(totalApprovedBudget) : undefined}
                >
                  {t.value}
                </div>
              </div>
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.tone}`}>
                <Icon name={t.icon} className="w-5 h-5" />
              </span>
            </div>
            <div className="flex items-end justify-between gap-3 mt-3 min-h-[32px]">
              <div
                className={`text-xs ${
                  t.delta?.good === true
                    ? "text-emerald-700 dark:text-emerald-400"
                    : t.delta?.good === false
                      ? "text-red-600 dark:text-red-400"
                      : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {t.delta?.text}
              </div>
              {t.trend && <Sparkline points={t.trend.points} format={t.trend.format} ariaLabel={t.trend.label} />}
            </div>
          </>
        );
        const base = "card p-4 text-left";
        return select ? (
          <button key={t.key} onClick={select} className={`${base} card-hover`}>
            {body}
          </button>
        ) : (
          <div key={t.key} className={base}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
