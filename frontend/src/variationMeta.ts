import { VariationStatus } from "./types";

export const VARIATION_STATUS_LABELS: Record<VariationStatus, string> = {
  PROPOSED: "Proposed",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const VARIATION_STATUS_COLORS: Record<VariationStatus, string> = {
  PROPOSED: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export const ALL_VARIATION_STATUSES: VariationStatus[] = [
  "PROPOSED",
  "APPROVED",
  "REJECTED",
];
