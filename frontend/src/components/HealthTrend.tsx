import { HealthHistoryPoint } from "../api";
import { RagStatus } from "../types";

const RANK: Record<RagStatus, number> = { GREEN: 0, AMBER: 1, RED: 2 };
const DOT: Record<RagStatus, string> = {
  GREEN: "bg-emerald-500",
  AMBER: "bg-amber-500",
  RED: "bg-red-500",
};

function worst(p: HealthHistoryPoint): RagStatus {
  return RANK[p.budgetHealth] >= RANK[p.scheduleHealth] ? p.budgetHealth : p.scheduleHealth;
}

function monthName(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { month: "short", year: "numeric", timeZone: "UTC" });
}

// A project's health over its last monthly reports: a dot per month
// (oldest left, worse of budget and schedule) and an arrow saying whether
// the latest month improved, slipped or held steady. Nothing is shown until
// there are at least two reports to compare.
export default function HealthTrend({ history }: { history?: HealthHistoryPoint[] }) {
  if (!history || history.length < 2) return null;
  const points = [...history].reverse();
  const latest = worst(history[0]);
  const previous = worst(history[1]);
  const change = RANK[previous] - RANK[latest];
  const arrow =
    change > 0
      ? { symbol: "↑", label: "improving", cls: "text-emerald-600 dark:text-emerald-400" }
      : change < 0
        ? { symbol: "↓", label: "slipping", cls: "text-red-600 dark:text-red-400" }
        : { symbol: "→", label: "steady", cls: "text-slate-500 dark:text-slate-400" };
  const title =
    `Monthly reports (budget / schedule), ${arrow.label}:\n` +
    points
      .map((p) => `${monthName(p.reportingMonth)}: ${p.budgetHealth.toLowerCase()} / ${p.scheduleHealth.toLowerCase()}`)
      .join("\n");
  return (
    <span className="inline-flex items-center gap-1 ml-2 align-middle" title={title} aria-label={`Health ${arrow.label}`}>
      <span className="inline-flex gap-0.5">
        {points.map((p, i) => (
          <span key={i} className={`w-1.5 h-1.5 rounded-full ${DOT[worst(p)]}`} />
        ))}
      </span>
      <span className={`text-xs font-semibold ${arrow.cls}`}>{arrow.symbol}</span>
    </span>
  );
}
