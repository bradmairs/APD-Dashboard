import { useMemo, useState } from "react";
import { Project } from "../types";
import { isProjectOverdue, STATUS_LABELS } from "../statusMeta";
import { formatDate } from "../format";
import { useTheme } from "../theme/ThemeContext";
import { CHART_GRIDLINE, CHART_TEXT_MUTED, SEQUENTIAL_BLUE, chartColor } from "../charts/palette";
import { Icon } from "./icons";

const DAY = 24 * 60 * 60 * 1000;
const CRITICAL = "#dc3c3d";

// Every project on one timeline: a bar from its start to its target (or
// actual) completion, a "today" line, overdue bars marked in red with the
// word "Overdue" (never colour alone), and a hover readout. Projects with no
// dates are listed underneath instead.
export default function PortfolioTimeline({ projects, onOpen }: { projects: Project[]; onOpen: (p: Project) => void }) {
  const { theme } = useTheme();
  const [hover, setHover] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      projects
        .map((p) => {
          const start = p.startDate ? new Date(p.startDate).getTime() : null;
          const endIso = p.actualCompletionDate ?? p.targetCompletionDate;
          const end = endIso ? new Date(endIso).getTime() : null;
          return { p, start: start ?? end, end: end ?? start };
        })
        .filter((r): r is { p: Project; start: number; end: number } => r.start !== null && r.end !== null)
        .sort((a, b) => a.start - b.start),
    [projects]
  );
  const undated = projects.filter((p) => !p.startDate && !p.targetCompletionDate && !p.actualCompletionDate);

  if (rows.length === 0) {
    return (
      <div className="card p-6 text-sm text-slate-500 dark:text-slate-400">
        No projects have start or completion dates yet, so there's nothing to place on the timeline.
      </div>
    );
  }

  const today = Date.now();
  const min = Math.min(today, ...rows.map((r) => r.start));
  const max = Math.max(today, ...rows.map((r) => r.end));
  const from = new Date(new Date(min).getFullYear(), new Date(min).getMonth(), 1).getTime();
  const to = new Date(new Date(max).getFullYear(), new Date(max).getMonth() + 1, 1).getTime();
  const span = to - from || DAY;
  const pct = (t: number) => ((t - from) / span) * 100;

  // Axis ticks: every month for short spans, else every quarter / year.
  const monthsSpan = span / (30 * DAY);
  const stepMonths = monthsSpan <= 18 ? 1 : monthsSpan <= 48 ? 3 : 12;
  const ticks: { t: number; label: string }[] = [];
  for (let d = new Date(from); d.getTime() <= to; d = new Date(d.getFullYear(), d.getMonth() + stepMonths, 1)) {
    ticks.push({
      t: d.getTime(),
      label: d.toLocaleDateString("en-AU", stepMonths === 12 ? { year: "numeric" } : { month: "short", year: "2-digit" }),
    });
  }

  const grid = chartColor(CHART_GRIDLINE, theme);
  const accent = chartColor(SEQUENTIAL_BLUE, theme);
  const muted = chartColor(CHART_TEXT_MUTED, theme);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Portfolio timeline</h2>
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm" style={{ background: accent }} /> Start → target completion
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm" style={{ background: CRITICAL }} /> Overdue
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-px h-3" style={{ background: accent }} /> Today
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(8rem,14rem)_1fr] gap-x-3">
        {/* Axis */}
        <div />
        <div className="relative h-6 border-b" style={{ borderColor: grid }}>
          {ticks.map((tk) => (
            <span
              key={tk.t}
              className="absolute -translate-x-1/2 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap"
              style={{ left: `${pct(tk.t)}%` }}
            >
              {tk.label}
            </span>
          ))}
        </div>

        {rows.map(({ p, start, end }) => {
          const overdue = isProjectOverdue(p);
          const color = overdue ? CRITICAL : p.actualCompletionDate ? muted : accent;
          const left = pct(start);
          const width = Math.max(0.6, pct(end) - left);
          const isHover = hover === p.id;
          return (
            <div key={p.id} className="contents">
              <button
                type="button"
                onClick={() => onOpen(p)}
                className="text-left text-sm py-2 truncate text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-300"
                title={p.name}
              >
                {p.name}
              </button>
              <div
                className="relative py-2"
                onMouseEnter={() => setHover(p.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onOpen(p)}
              >
                {ticks.map((tk) => (
                  <span key={tk.t} className="absolute top-0 bottom-0 w-px" style={{ left: `${pct(tk.t)}%`, background: grid }} />
                ))}
                <span className="absolute top-0 bottom-0 w-px z-10" style={{ left: `${pct(today)}%`, background: accent }} />
                <div
                  className="relative h-5 rounded cursor-pointer transition-opacity"
                  style={{ marginLeft: `${left}%`, width: `${width}%`, background: color, opacity: isHover ? 1 : 0.85 }}
                />
                {overdue && (
                  <span
                    className="absolute top-1/2 -translate-y-1/2 text-[11px] font-medium text-red-700 dark:text-red-300 whitespace-nowrap pl-1.5 inline-flex items-center gap-0.5"
                    style={{ left: `${Math.min(left + width, 88)}%` }}
                  >
                    <Icon name="alert" className="w-3 h-3" /> Overdue
                  </span>
                )}
                {isHover && (
                  <div
                    className="absolute z-20 -top-11 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs px-2.5 py-1.5 shadow-lg whitespace-nowrap pointer-events-none"
                    style={{ left: `${Math.min(left, 70)}%` }}
                  >
                    <span className="font-medium">{p.name}</span> · {STATUS_LABELS[p.status]} · {formatDate(p.startDate)} →{" "}
                    {formatDate(p.actualCompletionDate ?? p.targetCompletionDate)}
                    {p.actualCompletionDate ? " (actual)" : ""}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {undated.length > 0 && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          No dates yet: {undated.map((p) => p.name).join(", ")}
        </p>
      )}
    </div>
  );
}
