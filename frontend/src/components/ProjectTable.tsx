import { ReactNode, useEffect, useRef, useState } from "react";
import { Project, ProjectStatus, User } from "../types";
import { ALL_STATUSES, isProjectOverdue, STATUS_COLORS, STATUS_LABELS } from "../statusMeta";
import { formatCurrency, formatDate } from "../format";
import { canModifyProject } from "../permissions";
import { ProjectHealth } from "../health";
import { HealthHistoryPoint } from "../api";
import HealthBadge from "./HealthBadge";
import HealthTrend from "./HealthTrend";
import RowMenu from "./RowMenu";

function taskCounts(project: Project): { done: number; total: number } | null {
  if (!project.tasks || project.tasks.length === 0) return null;
  return { done: project.tasks.filter((t) => t.status === "DONE").length, total: project.tasks.length };
}

function TaskProgress({ project }: { project: Project }) {
  const counts = taskCounts(project);
  if (!counts) return <span className="text-slate-500">—</span>;
  const pct = Math.round((counts.done / counts.total) * 100);
  return (
    <div className="flex items-center gap-2 min-w-[6rem]" title={`${counts.done} of ${counts.total} tasks done`}>
      <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
        {counts.done}/{counts.total}
      </span>
    </div>
  );
}

// Optional columns the user can hide (remembered in this browser). Project
// and Actions always show.
type ColumnId = "status" | "health" | "manager" | "location" | "budget" | "target" | "tasks";
const COLUMNS: { id: ColumnId; label: string; align?: "right" }[] = [
  { id: "status", label: "Status" },
  { id: "health", label: "Health" },
  { id: "manager", label: "Manager" },
  { id: "location", label: "Location" },
  { id: "budget", label: "Original Budget", align: "right" },
  { id: "target", label: "Target Completion" },
  { id: "tasks", label: "Tasks" },
];
const HIDDEN_KEY = "apd.projectTable.hiddenColumns";

function loadHidden(): Set<ColumnId> {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as ColumnId[]) : []);
  } catch {
    return new Set();
  }
}

interface Props {
  projects: Project[];
  currentUser: User | null;
  healthByProjectId: Record<string, ProjectHealth>;
  // Last few monthly reports' RAG per project (for the trend dots).
  healthHistory?: Record<string, HealthHistoryPoint[]>;
  onOpen: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  // Change a project's status straight from the table.
  onStatusChange?: (project: Project, status: ProjectStatus) => Promise<void>;
}

export default function ProjectTable({
  projects,
  currentUser,
  healthByProjectId,
  healthHistory,
  onOpen,
  onEdit,
  onDelete,
  onStatusChange,
}: Props) {
  const [hidden, setHidden] = useState<Set<ColumnId>>(loadHidden);
  const shown = COLUMNS.filter((c) => !hidden.has(c.id));

  function toggleColumn(id: ColumnId) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(HIDDEN_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // not remembered
      }
      return next;
    });
  }

  if (projects.length === 0) {
    return (
      <div className="text-center text-slate-500 dark:text-slate-400 py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        No projects match the current filters.
      </div>
    );
  }

  function statusCell(project: Project) {
    const badge = (
      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[project.status]}`}>
        {STATUS_LABELS[project.status]}
      </span>
    );
    if (!onStatusChange || !canModifyProject(project, currentUser)) return badge;
    return <StatusSelect project={project} onChange={onStatusChange} />;
  }

  function cell(project: Project, id: ColumnId): ReactNode {
    switch (id) {
      case "status":
        return statusCell(project);
      case "health":
        return (
          <span className="whitespace-nowrap">
            {healthByProjectId[project.id] && <HealthBadge health={healthByProjectId[project.id]} />}
            <HealthTrend history={healthHistory?.[project.id]} />
          </span>
        );
      case "manager":
        return project.projectManager || "—";
      case "location":
        return project.location || "—";
      case "budget":
        return formatCurrency(project.budget);
      case "target":
        return (
          <span className={isProjectOverdue(project) ? "text-red-600 dark:text-red-400 font-medium" : ""}>
            {formatDate(project.targetCompletionDate)}
          </span>
        );
      case "tasks":
        return <TaskProgress project={project} />;
    }
  }

  function actions(project: Project) {
    return canModifyProject(project, currentUser) ? (
      <RowMenu
        label={`Actions for ${project.name}`}
        items={[
          { label: "Open", icon: "external", onClick: () => onOpen(project) },
          { label: "Edit", icon: "edit", onClick: () => onEdit(project) },
          { label: "Delete", icon: "trash", danger: true, onClick: () => onDelete(project) },
        ]}
      />
    ) : (
      <span className="text-slate-500 dark:text-slate-400 text-xs" title="Only the project's creator or an admin can edit it">
        {project.createdBy ? `${project.createdBy.name} only` : ""}
      </span>
    );
  }

  const th = "px-4 py-3 font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 lg:sticky lg:top-[var(--app-header-h,0px)] z-10";

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <ColumnChooser hidden={hidden} onToggle={toggleColumn} />
      </div>

      {/* Phones: one card per project. */}
      <ul className="md:hidden space-y-3">
        {projects.map((project) => (
          <li
            key={project.id}
            onClick={() => onOpen(project)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.target === e.currentTarget) onOpen(project);
            }}
            className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-slate-900 dark:text-slate-100">{project.name}</div>
                {(project.projectNumber || project.assetType) && (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {[project.projectNumber, project.assetType].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
              <div onClick={(e) => e.stopPropagation()}>{statusCell(project)}</div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {shown
                .filter((c) => c.id !== "status")
                .map((c) => (
                  <div key={c.id} className="min-w-0">
                    <dt className="text-xs text-slate-500 dark:text-slate-400">{c.label}</dt>
                    <dd className="text-slate-800 dark:text-slate-200">{cell(project, c.id)}</dd>
                  </div>
                ))}
            </dl>
            <div className="mt-3 text-sm text-right" onClick={(e) => e.stopPropagation()}>
              {actions(project)}
            </div>
          </li>
        ))}
      </ul>

      {/* Wider screens: the table, with its header row pinned under the top bar. */}
      <div className="hidden md:block overflow-x-auto lg:overflow-visible bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
        <table className="min-w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              <th className={`${th} text-left rounded-tl-lg border-b border-slate-200 dark:border-slate-700`}>Project</th>
              {shown.map((c) => (
                <th
                  key={c.id}
                  className={`${th} ${c.align === "right" ? "text-right" : "text-left"} border-b border-slate-200 dark:border-slate-700`}
                >
                  {c.label}
                </th>
              ))}
              <th className={`${th} text-right rounded-tr-lg border-b border-slate-200 dark:border-slate-700`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr
                key={project.id}
                onClick={() => onOpen(project)}
                tabIndex={0}
                aria-label={`Open ${project.name}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.target === e.currentTarget) onOpen(project);
                }}
                className="group hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer [&>td]:border-b [&>td]:border-slate-100 dark:[&>td]:border-slate-700 [&:last-child>td]:border-b-0"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900 dark:text-slate-100">{project.name}</div>
                  {(project.projectNumber || project.assetType) && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {[project.projectNumber, project.assetType].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </td>
                {shown.map((c) => (
                  <td
                    key={c.id}
                    className={`px-4 py-3 text-slate-700 dark:text-slate-300 ${c.align === "right" ? "text-right" : ""}`}
                    onClick={c.id === "status" ? (e) => e.stopPropagation() : undefined}
                  >
                    {cell(project, c.id)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  {actions(project)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// The status as a coloured drop-down: pick a new one to save it straight
// away, no form needed.
function StatusSelect({
  project,
  onChange,
}: {
  project: Project;
  onChange: (project: Project, status: ProjectStatus) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  // Shows the new status straight away while it saves; back to the old one
  // if the save fails.
  const [shown, setShown] = useState<ProjectStatus>(project.status);
  useEffect(() => setShown(project.status), [project.status]);
  return (
    <select
      aria-label={`Status of ${project.name}`}
      value={shown}
      disabled={saving}
      onClick={(e) => e.stopPropagation()}
      onChange={async (e) => {
        const next = e.target.value as ProjectStatus;
        setShown(next);
        setSaving(true);
        try {
          await onChange(project, next);
        } catch {
          setShown(project.status);
        } finally {
          setSaving(false);
        }
      }}
      title="Change the status"
      className={`rounded-full pl-2 pr-6 py-0.5 text-xs font-medium border-0 cursor-pointer appearance-none bg-no-repeat bg-[length:10px] bg-[right_6px_center] bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2364748b' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")] ${STATUS_COLORS[shown]} ${saving ? "opacity-80" : ""}`}
    >
      {ALL_STATUSES.map((s) => (
        <option key={s} value={s} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}

function ColumnChooser({ hidden, onToggle }: { hidden: Set<ColumnId>; onToggle: (id: ColumnId) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-xs px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
      >
        Columns ▾
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-52 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg p-2 z-30">
          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Show columns</div>
          {COLUMNS.map((c) => (
            <label key={c.id} className="flex items-center gap-2 px-2 py-1 text-sm text-slate-700 dark:text-slate-200 rounded hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
              <input type="checkbox" checked={!hidden.has(c.id)} onChange={() => onToggle(c.id)} />
              {c.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
