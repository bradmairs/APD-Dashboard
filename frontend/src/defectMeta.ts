import { DefectStatus } from "./types";

export const DEFECT_STATUS_LABELS: Record<DefectStatus, string> = {
  OPEN: "Open",
  RECTIFIED: "Rectified",
  VERIFIED: "Verified",
  DISPUTED: "Disputed",
};

export const DEFECT_STATUS_COLORS: Record<DefectStatus, string> = {
  OPEN: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  RECTIFIED: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  VERIFIED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  DISPUTED: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
};

export const ALL_DEFECT_STATUSES: DefectStatus[] = [
  "OPEN",
  "RECTIFIED",
  "VERIFIED",
  "DISPUTED",
];

export const DEFECT_CATEGORY_SUGGESTIONS = [
  "Civil",
  "Mechanical",
  "Electrical",
  "Finishes",
  "Landscaping",
];

const STATUS_RANK: Record<DefectStatus, number> = {
  OPEN: 0,
  DISPUTED: 1,
  RECTIFIED: 2,
  VERIFIED: 3,
};

// Sorts the most-outstanding defects first: open and disputed items
// need attention before rectified-but-unverified ones, and verified
// (closed) defects sink to the bottom.
export function defectStatusRank(status: DefectStatus): number {
  return STATUS_RANK[status];
}
