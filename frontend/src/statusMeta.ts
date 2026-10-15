import { Project, ProjectStatus } from "./types";

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: "Planning",
  DESIGN: "Design",
  TENDER: "Tender",
  CONSTRUCTION: "Construction",
  PROJECT_COMPLETION: "Project Completion",
  DEFECTS_LIABILITY: "Defects Liability",
  COMPLETE: "Complete",
  ON_HOLD: "On Hold",
  CANCELLED: "Cancelled",
};

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  PLANNING: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
  DESIGN: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  TENDER: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  CONSTRUCTION: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  PROJECT_COMPLETION: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  DEFECTS_LIABILITY:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  COMPLETE: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  ON_HOLD: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export const ALL_STATUSES: ProjectStatus[] = [
  "PLANNING",
  "DESIGN",
  "TENDER",
  "CONSTRUCTION",
  "PROJECT_COMPLETION",
  "DEFECTS_LIABILITY",
  "COMPLETE",
  "ON_HOLD",
  "CANCELLED",
];

// A project is only "overdue" while it's still working toward its target
// completion date. Once construction's main works are done (Project
// Completion, Defects Liability, Complete) or the project is Cancelled,
// passing that original date is expected, not late.
export const STATUSES_EXEMPT_FROM_OVERDUE: ProjectStatus[] = [
  "PROJECT_COMPLETION",
  "DEFECTS_LIABILITY",
  "COMPLETE",
  "CANCELLED",
];

export function isProjectOverdue(project: Project): boolean {
  if (!project.targetCompletionDate) return false;
  if (STATUSES_EXEMPT_FROM_OVERDUE.includes(project.status)) return false;
  return new Date(project.targetCompletionDate) < new Date();
}
