import { ToolSuggestionCategory, ToolSuggestionStatus } from "./types";

export const TOOL_SUGGESTION_CATEGORY_LABELS: Record<ToolSuggestionCategory, string> = {
  NEW_FEATURE: "New Feature",
  IMPROVEMENT: "Improvement",
  BUG: "Bug / Issue",
  OTHER: "Other",
};

export const TOOL_SUGGESTION_CATEGORY_COLORS: Record<ToolSuggestionCategory, string> = {
  NEW_FEATURE: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  IMPROVEMENT: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  BUG: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  OTHER: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
};

export const ALL_TOOL_SUGGESTION_CATEGORIES: ToolSuggestionCategory[] = [
  "NEW_FEATURE",
  "IMPROVEMENT",
  "BUG",
  "OTHER",
];

export const TOOL_SUGGESTION_STATUS_LABELS: Record<ToolSuggestionStatus, string> = {
  OPEN: "Open",
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
  DECLINED: "Declined",
};

export const TOOL_SUGGESTION_STATUS_COLORS: Record<ToolSuggestionStatus, string> = {
  OPEN: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  PLANNED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  IN_PROGRESS: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  DONE: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  DECLINED: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
};

export const ALL_TOOL_SUGGESTION_STATUSES: ToolSuggestionStatus[] = [
  "OPEN",
  "PLANNED",
  "IN_PROGRESS",
  "DONE",
  "DECLINED",
];
