import { Project, User } from "../types";
import { isProjectOverdue, STATUS_COLORS, STATUS_LABELS } from "../statusMeta";
import { formatCurrency, formatDate } from "../format";
import { canModifyProject } from "../permissions";
import { ProjectHealth } from "../health";
import HealthBadge from "./HealthBadge";

function taskProgress(project: Project): string | null {
  if (!project.tasks || project.tasks.length === 0) return null;
  const done = project.tasks.filter((t) => t.status === "DONE").length;
  return `${done}/${project.tasks.length}`;
}

interface Props {
  projects: Project[];
  currentUser: User | null;
  healthByProjectId: Record<string, ProjectHealth>;
  onOpen: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export default function ProjectTable({
  projects,
  currentUser,
  healthByProjectId,
  onOpen,
  onEdit,
  onDelete,
}: Props) {
  if (projects.length === 0) {
    return (
      <div className="text-center text-slate-500 dark:text-slate-400 py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        No projects match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
        <thead className="bg-slate-50 dark:bg-slate-900/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
              Project
            </th>
            <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
              Status
            </th>
            <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
              Health
            </th>
            <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
              Manager
            </th>
            <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
              Location
            </th>
            <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
              Original Budget
            </th>
            <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
              Target Completion
            </th>
            <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
              Tasks
            </th>
            <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {projects.map((project) => (
            <tr
              key={project.id}
              onClick={() => onOpen(project)}
              className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
            >
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {project.name}
                </div>
                {(project.projectNumber || project.assetType) && (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {[project.projectNumber, project.assetType].filter(Boolean).join(" · ")}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATUS_COLORS[project.status]
                  }`}
                >
                  {STATUS_LABELS[project.status]}
                </span>
              </td>
              <td className="px-4 py-3">
                {healthByProjectId[project.id] && (
                  <HealthBadge health={healthByProjectId[project.id]} />
                )}
              </td>
              <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                {project.projectManager || "—"}
              </td>
              <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                {project.location || "—"}
              </td>
              <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                {formatCurrency(project.budget)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={
                    isProjectOverdue(project)
                      ? "text-red-600 dark:text-red-400 font-medium"
                      : "text-slate-700 dark:text-slate-300"
                  }
                >
                  {formatDate(project.targetCompletionDate)}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                {taskProgress(project) ?? "—"}
              </td>
              <td
                className="px-4 py-3 text-right whitespace-nowrap"
                onClick={(e) => e.stopPropagation()}
              >
                {canModifyProject(project, currentUser) ? (
                  <>
                    <button
                      onClick={() => onEdit(project)}
                      className="text-blue-600 dark:text-blue-400 hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(project)}
                      className="text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 text-xs">
                    {project.createdBy ? `${project.createdBy.name} only` : ""}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
