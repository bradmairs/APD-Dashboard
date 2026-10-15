import { EotStatus } from "./types";

export const EOT_STATUS_LABELS: Record<EotStatus, string> = {
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const EOT_STATUS_COLORS: Record<EotStatus, string> = {
  SUBMITTED: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export const ALL_EOT_STATUSES: EotStatus[] = ["SUBMITTED", "APPROVED", "REJECTED"];

export const EOT_CAUSE_SUGGESTIONS = [
  "Weather",
  "Latent Conditions",
  "Client-Directed Change",
  "Industrial Action",
  "Force Majeure",
];
