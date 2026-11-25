import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getTrimLinks } from "../api";
import { ActionItem, Project, Task, TrimLink } from "../types";
import { isTaskDueSoon, isTaskOverdue } from "../taskMeta";
import { formatDate } from "../format";
import { trimHref, useTrimRecordUrl } from "../trim";
import { ProjectHealth } from "../health";
import { DueCalendarWidget, PortfolioHealthWidget, UpcomingCompletionsWidget } from "./DashboardWidgets";

interface Props {
  projects: Project[];
  tasks: Task[];
  actionItems: ActionItem[];
  // When set, only this project manager's items are listed ("My projects").
  projectManager: string;
  healthByProjectId?: Record<string, ProjectHealth>;
}

interface DueRow {
  key: string;
  title: string;
  projectId: string | null;
  projectName: string;
  dueDate: string;
  overdue: boolean;
}

const MAX_DUE = 6;
const MAX_LINKS = 6;

function isActionOpen(a: ActionItem) {
  return a.status !== "DONE";
}

// The right-hand column beside the projects list: what's due in the next
// week (tasks and meeting actions), and the shared GVW / TRIM links. Both
// are read-only shortcuts; the full lists stay on Today & Upcoming and
// TRIM & GVW Links.
export default function DashboardSideColumn({ projects, tasks, actionItems, projectManager, healthByProjectId }: Props) {
  const [links, setLinks] = useState<TrimLink[]>([]);
  const recordUrl = useTrimRecordUrl();

  useEffect(() => {
    getTrimLinks()
      .then(setLinks)
      .catch(() => setLinks([]));
  }, []);

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const due = useMemo(() => {
    const inScope = (projectId: string | null) => {
      if (!projectManager) return true;
      if (!projectId) return false;
      return projectById.get(projectId)?.projectManager === projectManager;
    };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rows: DueRow[] = [];
    for (const t of tasks) {
      if (!t.dueDate || !(isTaskOverdue(t) || isTaskDueSoon(t)) || !inScope(t.projectId)) continue;
      rows.push({
        key: `t-${t.id}`,
        title: t.title,
        projectId: t.projectId,
        projectName: t.project?.name ?? projectById.get(t.projectId ?? "")?.name ?? "Portfolio",
        dueDate: t.dueDate,
        overdue: isTaskOverdue(t),
      });
    }
    const weekAhead = new Date(today);
    weekAhead.setDate(weekAhead.getDate() + 7);
    for (const a of actionItems) {
      if (!a.dueDate || !isActionOpen(a) || !inScope(a.projectId)) continue;
      const d = new Date(a.dueDate);
      if (d > weekAhead) continue;
      rows.push({
        key: `a-${a.id}`,
        title: a.title,
        projectId: a.projectId,
        projectName: projectById.get(a.projectId)?.name ?? "",
        dueDate: a.dueDate,
        overdue: d < today,
      });
    }
    return rows.sort((x, y) => x.dueDate.localeCompare(y.dueDate));
  }, [tasks, actionItems, projectById, projectManager]);

  const general = links.filter((l) => l.kind === "GENERAL");
  const quickLinks = (general.length > 0 ? general : links).slice(0, MAX_LINKS);

  const card = "card";

  const scoped = projectManager ? projects.filter((p) => p.projectManager === projectManager) : projects;

  return (
    <div className="space-y-6">
      {healthByProjectId && <PortfolioHealthWidget projects={scoped} healthByProjectId={healthByProjectId} />}
      <section className={card} aria-labelledby="due-soon-heading">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 id="due-soon-heading" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Due soon
          </h2>
          <Link to="/?tab=today" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            Today &amp; Upcoming →
          </Link>
        </div>
        {due.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-slate-500 dark:text-slate-400">Nothing due in the next week.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {due.slice(0, MAX_DUE).map((row) => (
              <li key={row.key} className="px-4 py-2.5 flex gap-3 items-start">
                <span
                  className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${row.overdue ? "bg-red-500" : "bg-amber-500"}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-slate-800 dark:text-slate-200 truncate" title={row.title}>
                    {row.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {row.projectId ? (
                      <Link to={`/projects/${row.projectId}`} className="hover:underline">
                        {row.projectName}
                      </Link>
                    ) : (
                      row.projectName
                    )}
                  </div>
                </div>
                <span
                  className={`text-xs whitespace-nowrap ${
                    row.overdue ? "text-red-600 dark:text-red-400 font-medium" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {row.overdue ? "Overdue · " : ""}
                  {formatDate(row.dueDate)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {due.length > MAX_DUE && (
          <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700">
            +{due.length - MAX_DUE} more on Today &amp; Upcoming
          </div>
        )}
      </section>

      <DueCalendarWidget tasks={tasks} actionItems={actionItems} />
      <UpcomingCompletionsWidget projects={scoped} />
      <section className={card} aria-labelledby="quick-links-heading">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 id="quick-links-heading" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Quick links
          </h2>
          <Link to="/?tab=trim" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            All links →
          </Link>
        </div>
        {quickLinks.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-slate-500 dark:text-slate-400">
            No shared links yet — add them on TRIM &amp; GVW Links.
          </p>
        ) : (
          <ul className="px-2 pb-2">
            {quickLinks.map((l) => {
              const href = trimHref(l.location, recordUrl);
              return (
                <li key={l.id}>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-2 py-1.5 rounded text-sm text-blue-700 dark:text-blue-300 hover:bg-slate-50 dark:hover:bg-slate-700 truncate"
                      title={l.location}
                    >
                      {l.title} ↗
                    </a>
                  ) : (
                    <span className="block px-2 py-1.5 text-sm text-slate-700 dark:text-slate-300 truncate" title={l.location}>
                      {l.title} <span className="text-xs text-slate-500">({l.location})</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
