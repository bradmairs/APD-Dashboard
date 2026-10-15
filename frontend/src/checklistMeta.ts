import { ChecklistItemStatus, ChecklistPhase } from "./types";

export const CHECKLIST_PHASE_LABELS: Record<ChecklistPhase, string> = {
  COMMISSIONING: "Commissioning",
  HANDOVER: "Handover",
};

export const CHECKLIST_PHASE_COLORS: Record<ChecklistPhase, string> = {
  COMMISSIONING: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  HANDOVER: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
};

export const ALL_CHECKLIST_PHASES: ChecklistPhase[] = ["COMMISSIONING", "HANDOVER"];

export const CHECKLIST_STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETE: "Complete",
  NOT_APPLICABLE: "Not Applicable",
};

export const CHECKLIST_STATUS_COLORS: Record<ChecklistItemStatus, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  IN_PROGRESS: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  COMPLETE: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  NOT_APPLICABLE: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
};

export const ALL_CHECKLIST_STATUSES: ChecklistItemStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETE",
  "NOT_APPLICABLE",
];
