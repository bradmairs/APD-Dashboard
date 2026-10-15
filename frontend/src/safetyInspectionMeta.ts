import { SafetyInspection, SafetyInspectionStatus } from "./types";

// Suggestions only — inspectionType is freeform text, the same
// suggest-but-don't-constrain pattern DocumentRecord uses for category.
export const INSPECTION_TYPE_SUGGESTIONS: string[] = [
  "Safety Walk",
  "Formal WHS Audit",
  "Housekeeping Inspection",
  "Traffic Management Review",
  "Erosion & Sediment Control Check",
];

export const SAFETY_INSPECTION_STATUS_LABELS: Record<SafetyInspectionStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  CLOSED: "Closed",
};

export const SAFETY_INSPECTION_STATUS_COLORS: Record<SafetyInspectionStatus, string> = {
  OPEN: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  IN_PROGRESS: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  CLOSED: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export const ALL_SAFETY_INSPECTION_STATUSES: SafetyInspectionStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "CLOSED",
];

// Sorts open/in-progress inspections first, then lowest score first within
// each group — the same status-then-severity pattern SqeRecord uses,
// adapted for a register that scores rather than rates severity directly.
export function safetyInspectionRank(inspection: SafetyInspection): number {
  return inspection.status === "CLOSED" ? 1 : 0;
}
