import { useEffect, useMemo, useState } from "react";
import { getProjects } from "../api";
import { Project } from "../types";
import { ALL_STATUSES, STATUS_LABELS } from "../statusMeta";
import { formatCurrency } from "../format";
import HorizontalBarChart, { BarDatum } from "../charts/HorizontalBarChart";
import StackedProgressChart, { ProgressDatum } from "../charts/StackedProgressChart";
import { SEQUENTIAL_BLUE, chartColor } from "../charts/palette";
import { useTheme } from "../theme/ThemeContext";
import ChartCard from "../components/ChartCard";
import AppLayout from "../components/AppLayout";

export default function ReportsPage() {
  const { theme } = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load projects")
      )
      .finally(() => setLoading(false));
  }, []);

  const statusData: BarDatum[] = useMemo(
    () =>
      ALL_STATUSES.map((status) => ({
        label: STATUS_LABELS[status],
        value: projects.filter((p) => p.status === status).length,
      })),
    [projects]
  );

  const budgetByAssetType: BarDatum[] = useMemo(() => {
    const totals = new Map<string, number>();
    for (const p of projects) {
      const key = p.assetType || "Unspecified";
      totals.set(key, (totals.get(key) || 0) + (p.budget ? Number(p.budget) : 0));
    }
    return Array.from(totals.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [projects]);

  const taskProgress: ProgressDatum[] = useMemo(() => {
    return projects
      .filter((p) => p.tasks && p.tasks.length > 0)
      .map((p) => {
        const tasks = p.tasks!;
        return {
          id: p.id,
          label: p.name,
          todo: tasks.filter((t) => t.status === "TODO").length,
          inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
          done: tasks.filter((t) => t.status === "DONE").length,
        };
      })
      .sort((a, b) => {
        const pctA = a.done / (a.todo + a.inProgress + a.done);
        const pctB = b.done / (b.todo + b.inProgress + b.done);
        return pctA - pctB;
      });
  }, [projects]);

  return (
    <AppLayout
      title="Reports"
      subtitle="Portfolio overview across all projects"
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-12">
            Loading…
          </div>
        ) : (
          <>
            <ChartCard title="Projects by Status">
              <HorizontalBarChart
                data={statusData}
                color={chartColor(SEQUENTIAL_BLUE, theme)}
                formatValue={(v) => String(v)}
              />
            </ChartCard>

            <ChartCard title="Budget by Asset Type">
              <HorizontalBarChart
                data={budgetByAssetType}
                color={chartColor(SEQUENTIAL_BLUE, theme)}
                formatValue={formatCurrency}
                emptyMessage="No budget data yet."
              />
            </ChartCard>

            <ChartCard title="Task Progress by Project">
              <StackedProgressChart data={taskProgress} />
            </ChartCard>
          </>
        )}
      </div>
    </AppLayout>
  );
}
