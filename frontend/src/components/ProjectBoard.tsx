import { useState } from "react";
import { Project, ProjectStatus, User } from "../types";
import { ALL_STATUSES, isProjectOverdue, STATUS_COLORS, STATUS_LABELS } from "../statusMeta";
import { canModifyProject } from "../permissions";
import { formatCurrency, formatDate } from "../format";
import { ProjectHealth } from "../health";
import HealthBadge from "./HealthBadge";
import { Icon } from "./icons";

interface Props {
  projects: Project[];
  currentUser: User | null;
  healthByProjectId: Record<string, ProjectHealth>;
  onOpen: (project: Project) => void;
  onStatusChange?: (project: Project, status: ProjectStatus) => Promise<void>;
}

// Projects as cards in a column per status. Drag a card to another column
// to change its status (only projects you can edit can be dragged). The
// columns scroll sideways inside the board, never the page.
export default function ProjectBoard({ projects, currentUser, healthByProjectId, onOpen, onStatusChange }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<ProjectStatus | null>(null);
  // Moves show straight away while they save.
  const [moved, setMoved] = useState<Record<string, ProjectStatus>>({});
  const statusOf = (p: Project) => moved[p.id] ?? p.status;

  async function drop(status: ProjectStatus) {
    setOver(null);
    const project = projects.find((p) => p.id === dragId);
    setDragId(null);
    if (!project || !onStatusChange || statusOf(project) === status) return;
    setMoved((m) => ({ ...m, [project.id]: status }));
    try {
      await onStatusChange(project, status);
    } finally {
      setMoved((m) => {
        const next = { ...m };
        delete next[project.id];
        return next;
      });
    }
  }

  return (
    <div className="overflow-x-auto pb-2 -mx-1 px-1">
      <div className="flex gap-4 min-w-max">
        {ALL_STATUSES.map((status) => {
          const cards = projects.filter((p) => statusOf(p) === status);
          return (
            <section
              key={status}
              aria-label={`${STATUS_LABELS[status]} (${cards.length})`}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                setOver(status);
              }}
              onDragLeave={() => setOver((s) => (s === status ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                drop(status);
              }}
              className={`w-72 shrink-0 rounded-xl p-2 transition-colors ${
                over === status ? "bg-blue-50 ring-2 ring-blue-300 dark:bg-blue-500/10 dark:ring-blue-700" : "bg-slate-100/70 dark:bg-slate-900/60"
              }`}
            >
              <header className="flex items-center gap-2 px-2 py-1.5">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
                  {STATUS_LABELS[status]}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{cards.length}</span>
              </header>
              <ul className="space-y-2 min-h-[4rem]">
                {cards.map((p) => {
                  const draggable = !!onStatusChange && canModifyProject(p, currentUser);
                  const overdue = isProjectOverdue(p);
                  return (
                    <li
                      key={p.id}
                      draggable={draggable}
                      onDragStart={(e) => {
                        setDragId(p.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOver(null);
                      }}
                      onClick={() => onOpen(p)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onOpen(p);
                      }}
                      className={`card card-hover p-3 cursor-pointer ${draggable ? "active:cursor-grabbing" : ""} ${
                        dragId === p.id ? "opacity-50" : ""
                      }`}
                    >
                      <div className="font-medium text-sm text-slate-900 dark:text-slate-100 leading-snug">{p.name}</div>
                      {(p.projectNumber || p.assetType) && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {[p.projectNumber, p.assetType].filter(Boolean).join(" · ")}
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 mt-2.5">
                        {healthByProjectId[p.id] ? <HealthBadge health={healthByProjectId[p.id]} /> : <span />}
                        <span className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">{formatCurrency(p.latestApprovedBudget ?? p.budget)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1 truncate">
                          <Icon name="user" className="w-3.5 h-3.5" />
                          {p.projectManager || "—"}
                        </span>
                        <span className={`inline-flex items-center gap-1 whitespace-nowrap ${overdue ? "text-red-600 dark:text-red-400 font-medium" : ""}`}>
                          <Icon name="flag" className="w-3.5 h-3.5" />
                          {overdue ? "Overdue · " : ""}
                          {formatDate(p.targetCompletionDate)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
