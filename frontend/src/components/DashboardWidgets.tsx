import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ActionItem, Project, RagStatus, ReportStatus, Task } from "../types";
import { ProjectHealth } from "../health";
import { formatDate } from "../format";
import { Icon } from "./icons";

const card = "card";

// Status palette (fixed, from the data-viz reference): each part is also
// named in text, so colour never carries the meaning alone.
const RAG: { key: RagStatus; label: string; color: string; icon: string }[] = [
  { key: "GREEN", label: "On track", color: "#0aac23", icon: "checkCircle" },
  { key: "AMBER", label: "Watch", color: "#fbb315", icon: "alert" },
  { key: "RED", label: "At risk", color: "#dc3c3d", icon: "alert" },
];

// One whole split into three parts: how many projects are green, amber, red.
export function PortfolioHealthWidget({
  projects,
  healthByProjectId,
}: {
  projects: Project[];
  healthByProjectId: Record<string, ProjectHealth>;
}) {
  const counts = RAG.map((r) => ({
    ...r,
    count: projects.filter((p) => healthByProjectId[p.id]?.overall === r.key).length,
  }));
  const total = counts.reduce((s, c) => s + c.count, 0);
  return (
    <section className={`${card} p-4`} aria-labelledby="w-health">
      <h2 id="w-health" className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
        Portfolio health
      </h2>
      {total === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No projects yet.</p>
      ) : (
        <>
          <div className="flex h-7 gap-[2px] rounded overflow-hidden" role="img" aria-label={counts.map((c) => `${c.label} ${c.count}`).join(", ")}>
            {counts
              .filter((c) => c.count > 0)
              .map((c) => {
                const share = Math.round((c.count / total) * 100);
                return (
                  <div
                    key={c.key}
                    title={`${c.label}: ${c.count} (${share}%)`}
                    className="h-full rounded-[4px] flex items-center px-1.5 text-[11px] font-semibold"
                    style={{ width: `${(c.count / total) * 100}%`, background: c.color, color: "#111111" }}
                  >
                    {share >= 15 ? `${share}%` : ""}
                  </div>
                );
              })}
          </div>
          <ul className="mt-3 space-y-1.5">
            {counts.map((c) => (
              <li key={c.key} className="flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
                <span className="flex-1 text-slate-700 dark:text-slate-300">{c.label}</span>
                <span className="tabular-nums text-slate-900 dark:text-slate-100 font-medium">{c.count}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function daysUntil(iso: string) {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86_400_000);
}

// The next few projects due to finish, with a countdown.
export function UpcomingCompletionsWidget({ projects }: { projects: Project[] }) {
  const upcoming = projects
    .filter((p) => p.targetCompletionDate && !p.actualCompletionDate && p.status !== "COMPLETE" && p.status !== "CANCELLED")
    .map((p) => ({ p, days: daysUntil(p.targetCompletionDate!) }))
    .filter((x) => x.days >= 0)
    .sort((a, b) => a.days - b.days)
    .slice(0, 4);
  return (
    <section className={`${card} p-4`} aria-labelledby="w-completions">
      <h2 id="w-completions" className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
        Next completions
      </h2>
      {upcoming.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No upcoming approved completion targets.</p>
      ) : (
        <ul className="space-y-3">
          {upcoming.map(({ p, days }) => (
            <li key={p.id} className="flex items-center gap-3">
              <div className="w-12 shrink-0 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-center py-1">
                <div className="text-base font-semibold text-blue-700 dark:text-blue-300 leading-none">{days}</div>
                <div className="text-[10px] uppercase tracking-wide text-blue-800 dark:text-blue-200">{days === 1 ? "day" : "days"}</div>
              </div>
              <div className="min-w-0">
                <Link to={`/projects/${p.id}`} className="block text-sm font-medium text-slate-800 dark:text-slate-200 truncate hover:underline">
                  {p.name}
                </Link>
                <div className="text-xs text-slate-500 dark:text-slate-400">Target {formatDate(p.targetCompletionDate)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// This month at a glance: a calendar with a dot on each day something
// (a task or action) is due; pick a day to list what's due then.
export function DueCalendarWidget({ tasks, actionItems }: { tasks: Task[]; actionItems: ActionItem[] }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [picked, setPicked] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, { title: string; projectId: string | null }[]>();
    const add = (iso: string | null, title: string, projectId: string | null) => {
      if (!iso) return;
      const key = iso.substring(0, 10);
      const list = map.get(key) ?? [];
      list.push({ title, projectId });
      map.set(key, list);
    };
    for (const t of tasks) if (t.status !== "DONE") add(t.dueDate, t.title, t.projectId);
    for (const a of actionItems) if (a.status !== "DONE") add(a.dueDate, a.title, a.projectId);
    return map;
  }, [tasks, actionItems]);

  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const first = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: first }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  const todayIso = iso(new Date());
  const pickedItems = picked ? byDay.get(picked) ?? [] : [];

  return (
    <section className={`${card} p-4`} aria-labelledby="w-calendar">
      <div className="flex items-center justify-between mb-2">
        <h2 id="w-calendar" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {month.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex">
          <button type="button" className="icon-btn !w-7 !h-7" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            <Icon name="chevronLeft" className="w-4 h-4" />
          </button>
          <button type="button" className="icon-btn !w-7 !h-7" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
            <Icon name="chevronRight" className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] font-medium text-slate-500 mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const key = iso(d);
          const due = byDay.get(key)?.length ?? 0;
          const overdue = due > 0 && key < todayIso;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setPicked(picked === key ? null : key)}
              aria-label={`${d.getDate()} ${month.toLocaleDateString("en-AU", { month: "long" })}${due ? `, ${due} due` : ""}`}
              aria-pressed={picked === key}
              className={`relative h-8 rounded-lg text-xs tabular-nums ${
                picked === key
                  ? "bg-blue-600 text-white"
                  : key === todayIso
                    ? "ring-1 ring-blue-500 text-blue-700 dark:text-blue-300 font-semibold"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {d.getDate()}
              {due > 0 && (
                <span
                  className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                    picked === key ? "bg-white" : overdue ? "bg-red-500" : "bg-blue-500"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            Due {formatDate(picked)}
          </div>
          {pickedItems.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">Nothing due.</p>
          ) : (
            <ul className="space-y-1">
              {pickedItems.slice(0, 6).map((it, i) => (
                <li key={i} className="text-sm truncate">
                  {it.projectId ? (
                    <Link to={`/projects/${it.projectId}`} className="text-slate-700 dark:text-slate-200 hover:underline">
                      {it.title}
                    </Link>
                  ) : (
                    <span className="text-slate-700 dark:text-slate-200">{it.title}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Projects with key details missing, so they're fixed before reporting:
// no project manager, no dates, no TRIM folder, no budget, or no monthly
// report started for this month (from the 15th). Click a project to fix it.
export function MissingDetailsWidget({ projects, reportStatus }: { projects: Project[]; reportStatus: ReportStatus[] | null }) {
  const active = projects.filter((p) => p.status !== "COMPLETE" && p.status !== "CANCELLED");
  const noReport = new Set((reportStatus ?? []).filter((r) => !r.hasReport).map((r) => r.projectId));
  const askReport = new Date().getDate() >= 15;
  const checks: { label: string; missing: (p: Project) => boolean }[] = [
    { label: "No project manager", missing: (p) => !p.projectManager },
    { label: "No start date or approved completion target", missing: (p) => !p.startDate || !p.targetCompletionDate },
    { label: "No TRIM folder", missing: (p) => !p.trimFolder },
    { label: "No budget", missing: (p) => !p.budget && !p.latestApprovedBudget },
    ...(askReport && reportStatus ? [{ label: "This month's report not started", missing: (p: Project) => noReport.has(p.id) }] : []),
  ];
  const rows = checks
    .map((c) => ({ ...c, projects: active.filter(c.missing) }))
    .filter((c) => c.projects.length > 0);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className={`${card} p-4`} aria-labelledby="w-missing">
      <h2 id="w-missing" className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
        Missing details
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5">
          <Icon name="checkCircle" className="w-4 h-4" /> Every active project has its key details.
        </p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.label}>
              <button
                type="button"
                onClick={() => setOpen(open === r.label ? null : r.label)}
                aria-expanded={open === r.label}
                className="w-full flex items-center gap-2 text-sm py-1 text-left text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
              >
                <Icon name="alert" className="w-4 h-4 text-amber-500" />
                <span className="flex-1">{r.label}</span>
                <span className="tabular-nums text-xs rounded-full px-2 py-0.5 bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                  {r.projects.length}
                </span>
              </button>
              {open === r.label && (
                <ul className="ml-6 mb-1 space-y-0.5">
                  {r.projects.map((p) => (
                    <li key={p.id}>
                      <Link to={`/projects/${p.id}`} className="text-xs text-blue-700 dark:text-blue-300 hover:underline">
                        {p.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
