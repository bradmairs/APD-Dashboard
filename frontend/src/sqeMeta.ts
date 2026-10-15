import { SqeCategory, SqeSeverity, SqeStatus } from "./types";

export const SQE_CATEGORY_LABELS: Record<SqeCategory, string> = {
  SAFETY: "Safety",
  QUALITY: "Quality",
  ENVIRONMENT: "Environment",
};

export const SQE_CATEGORY_COLORS: Record<SqeCategory, string> = {
  SAFETY: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  QUALITY: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  ENVIRONMENT: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

export const ALL_SQE_CATEGORIES: SqeCategory[] = ["SAFETY", "QUALITY", "ENVIRONMENT"];

// Same Low/Medium/High/Critical band language as riskBand — an SQE
// severity documents something that already happened, so it's rated
// directly rather than derived from a likelihood x consequence score.
export const SQE_SEVERITY_LABELS: Record<SqeSeverity, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const SQE_SEVERITY_COLORS: Record<SqeSeverity, string> = {
  LOW: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export const ALL_SQE_SEVERITIES: SqeSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export const SQE_STATUS_LABELS: Record<SqeStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  CLOSED: "Closed",
};

export const SQE_STATUS_COLORS: Record<SqeStatus, string> = {
  OPEN: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  IN_PROGRESS: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  CLOSED: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export const ALL_SQE_STATUSES: SqeStatus[] = ["OPEN", "IN_PROGRESS", "CLOSED"];

const SEVERITY_RANK: Record<SqeSeverity, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

export function sqeSeverityRank(severity: SqeSeverity): number {
  return SEVERITY_RANK[severity];
}
