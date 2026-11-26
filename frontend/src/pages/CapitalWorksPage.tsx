import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CashFlowEntry, Project } from "../types";
import { getAllCashFlowEntries, getProjects } from "../api";
import { batched } from "../batch";
import { formatCurrency } from "../format";
import { useTheme } from "../theme/ThemeContext";
import { CASH_FLOW_ACTUAL, CASH_FLOW_FORECAST, CHART_GRIDLINE, chartColor } from "../charts/palette";
import AppLayout from "../components/AppLayout";
import ExportCsvButton from "../components/ExportCsvButton";
import { SkeletonTable } from "../components/Skeleton";

// Australian financial year (July to June): "2026-27".
function fyOf(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

function compact(v: number) {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return formatCurrency(v);
}

interface Cell {
  planned: number;
  actual: number;
}

// The capital works program by financial year: each project's planned
// (forecast) and actual spend per FY from its cash flow, with totals and a
// chart of the whole program. Excl. GST, as entered.
export default function CapitalWorksPage() {
  const { theme } = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<CashFlowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [manager, setManager] = useState("");
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    batched(() => Promise.all([getProjects(), getAllCashFlowEntries()]), { preferCache: true })
      .then(([p, e]) => {
        setProjects(p);
        setEntries(e);
      })
      .finally(() => setLoading(false));
  }, []);

  const currentFy = fyOf(new Date().toISOString());
  const managers = Array.from(new Set(projects.map((p) => p.projectManager).filter((m): m is string => !!m))).sort();
  const shown = projects.filter((p) => !manager || p.projectManager === manager);

  const { years, grid, totals } = useMemo(() => {
    const ids = new Set(shown.map((p) => p.id));
    const grid = new Map<string, Map<string, Cell>>();
    const yearSet = new Set<string>();
    for (const e of entries) {
      if (!ids.has(e.projectId)) continue;
      const fy = fyOf(e.month);
      yearSet.add(fy);
      const row = grid.get(e.projectId) ?? new Map<string, Cell>();
      const cell = row.get(fy) ?? { planned: 0, actual: 0 };
      if (e.type === "ACTUAL") cell.actual += Number(e.amount || 0);
      else cell.planned += Number(e.amount || 0);
      row.set(fy, cell);
      grid.set(e.projectId, row);
    }
    yearSet.add(currentFy);
    const years = Array.from(yearSet).sort();
    const totals = new Map<string, Cell>();
    for (const fy of years) {
      const t = { planned: 0, actual: 0 };
      for (const row of grid.values()) {
        const c = row.get(fy);
        if (c) {
          t.planned += c.planned;
          t.actual += c.actual;
        }
      }
      totals.set(fy, t);
    }
    return { years, grid, totals };
  }, [entries, shown, currentFy]);

  const rows = shown
    .filter((p) => grid.has(p.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const noCashFlow = shown.filter((p) => !grid.has(p.id) && p.status !== "COMPLETE" && p.status !== "CANCELLED");

  const max = Math.max(1, ...years.map((fy) => Math.max(totals.get(fy)!.planned, totals.get(fy)!.actual)));
  const planColor = chartColor(CASH_FLOW_FORECAST, theme);
  const actColor = chartColor(CASH_FLOW_ACTUAL, theme);
  const grid1 = chartColor(CHART_GRIDLINE, theme);

  const csvRows = rows.map((p) => {
    const row: Record<string, unknown> = { project: p.name, manager: p.projectManager ?? "" };
    for (const fy of years) {
      const c = grid.get(p.id)?.get(fy);
      row[`${fy} planned`] = c ? c.planned.toFixed(2) : "";
      row[`${fy} actual`] = c ? c.actual.toFixed(2) : "";
    }
    return row;
  });

  return (
    <AppLayout
      title="Capital works by financial year"
      subtitle="Planned (forecast) and actual spend per project, July to June, excl. GST"
      actions={
        <ExportCsvButton
          filename="capital-works-by-fy"
          columns={[
            { header: "Project", key: "project" },
            { header: "Manager", key: "manager" },
            ...years.flatMap((fy) => [
              { header: `${fy} planned`, key: `${fy} planned` },
              { header: `${fy} actual`, key: `${fy} actual` },
            ]),
          ]}
          rows={csvRows}
        />
      }
    >
      {loading ? (
        <SkeletonTable rows={6} />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <select
              value={manager}
              onChange={(e) => setManager(e.target.value)}
              aria-label="Project manager"
              className="text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-2 py-1.5"
            >
              <option value="">All project managers</option>
              {managers.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <section className="card p-4" aria-labelledby="cw-chart">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 id="cw-chart" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Program by financial year
              </h2>
              <div className="flex gap-4 text-xs text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ background: planColor }} /> Planned
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ background: actColor }} /> Actual
                </span>
              </div>
            </div>
            <div className="flex items-end gap-4 h-48 border-b px-2" style={{ borderColor: grid1 }}>
              {years.map((fy) => {
                const t = totals.get(fy)!;
                return (
                  <div
                    key={fy}
                    className="relative flex-1 flex items-end justify-center gap-[2px] h-full"
                    onMouseEnter={() => setHover(fy)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <div className="w-1/3 max-w-[28px] rounded-t" style={{ height: `${(t.planned / max) * 100}%`, background: planColor }} />
                    <div className="w-1/3 max-w-[28px] rounded-t" style={{ height: `${(t.actual / max) * 100}%`, background: actColor }} />
                    {hover === fy && (
                      <div className="absolute bottom-full mb-2 z-10 whitespace-nowrap rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs px-2.5 py-1.5 shadow-lg pointer-events-none">
                        <div className="font-medium">FY {fy}</div>
                        <div>Planned {formatCurrency(t.planned)}</div>
                        <div>Actual {formatCurrency(t.actual)}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 px-2 mt-1">
              {years.map((fy) => (
                <div
                  key={fy}
                  className={`flex-1 text-center text-xs tabular-nums ${
                    fy === currentFy ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {fy}
                  {fy === currentFy ? " (now)" : ""}
                </div>
              ))}
            </div>
          </section>

          <div className="card overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Project</th>
                  {years.map((fy) => (
                    <th
                      key={fy}
                      className={`px-4 py-3 text-right font-medium whitespace-nowrap ${
                        fy === currentFy ? "text-blue-700 dark:text-blue-300" : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      FY {fy}
                      <div className="text-[11px] font-normal text-slate-600 dark:text-slate-400">planned / actual</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-2.5">
                      <Link to={`/projects/${p.id}?tab=budget`} className="font-medium text-slate-900 dark:text-slate-100 hover:underline">
                        {p.name}
                      </Link>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{p.projectManager || "—"}</div>
                    </td>
                    {years.map((fy) => {
                      const c = grid.get(p.id)?.get(fy);
                      return (
                        <td key={fy} className={`px-4 py-2.5 text-right whitespace-nowrap ${fy === currentFy ? "bg-blue-50/40 dark:bg-blue-500/5" : ""}`}>
                          {c ? (
                            <>
                              <span className="text-slate-600 dark:text-slate-300">{compact(c.planned)}</span>
                              <span className="text-slate-500"> / </span>
                              <span className={c.actual > c.planned && c.planned > 0 ? "text-red-600 dark:text-red-400 font-medium" : "text-slate-900 dark:text-slate-100 font-medium"}>
                                {compact(c.actual)}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 font-semibold">
                <tr>
                  <td className="px-4 py-3 text-slate-900 dark:text-slate-100">Total</td>
                  {years.map((fy) => {
                    const t = totals.get(fy)!;
                    return (
                      <td key={fy} className="px-4 py-3 text-right whitespace-nowrap text-slate-900 dark:text-slate-100">
                        {compact(t.planned)} / {compact(t.actual)}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            An actual shown in red is above that year's plan.
            {noCashFlow.length > 0 && ` No cash flow entered yet: ${noCashFlow.map((p) => p.name).join(", ")}.`}
          </p>
        </div>
      )}
    </AppLayout>
  );
}
