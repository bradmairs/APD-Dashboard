import { ActionItemStatus, ActionType } from "./types";

export const ACTION_STATUS_LABELS: Record<ActionItemStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

export const ACTION_STATUS_COLORS: Record<ActionItemStatus, string> = {
  OPEN: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  IN_PROGRESS: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  DONE: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

export const ALL_ACTION_STATUSES: ActionItemStatus[] = ["OPEN", "IN_PROGRESS", "DONE"];

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  ACTION: "Action",
  DECISION: "Decision",
};

export const ACTION_TYPE_COLORS: Record<ActionType, string> = {
  ACTION: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  DECISION: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
};

export const ALL_ACTION_TYPES: ActionType[] = ["ACTION", "DECISION"];
