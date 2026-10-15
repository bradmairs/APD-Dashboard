import { Link } from "react-router-dom";
import { Project } from "../types";
import { ProjectHealth } from "../health";
import { RAG_COLORS, RAG_LABELS } from "../ragMeta";

interface Props {
  projects: Project[];
  healthByProjectId: Record<string, ProjectHealth>;
}

// Which dimension(s) explain a project's overall rating, and why — the
// worst-rated dimensions first, so "Budget" only shows for an Amber overall
// if nothing is Red — paired with the same reason text the detailed badge's
// tooltip shows, so this panel doesn't need a hover to be useful.
function flaggedReasons(health: ProjectHealth): string[] {
  const atLevel = (level: ProjectHealth["overall"]) =>
    (["schedule", "budget", "risk"] as const)
      .filter((dim) => health[dim] === level)
      .map((dim) => `${dim[0].toUpperCase()}${dim.slice(1)} — ${health.reasons[dim]}`);

  const red = atLevel("RED");
  return red.length > 0 ? red : atLevel("AMBER");
}

export default function NeedsAttentionPanel({ projects, healthByProjectId }: Props) {
  const flagged = projects
    .map((project) => ({ project, health: healthByProjectId[project.id] }))
    .filter((x): x is { project: Project; health: ProjectHealth } =>
      Boolean(x.health && x.health.overall !== "GREEN")
    )
    .sort((a, b) => (a.health.overall === b.health.overall ? 0 : a.health.overall === "RED" ? -1 : 1));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Needs Attention
        </h2>
        {flagged.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {flagged.length} project{flagged.length === 1 ? "" : "s"} flagged
          </span>
        )}
      </div>

      {flagged.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No projects are currently flagged — schedule, budget, and risk all look healthy.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {flagged.map(({ project, health }) => (
            <li key={project.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Link
                  to={`/projects/${project.id}`}
                  className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:underline"
                >
                  {project.name}
                </Link>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {flaggedReasons(health).join(" · ")}
                </div>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${RAG_COLORS[health.overall]}`}
              >
                {RAG_LABELS[health.overall]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
