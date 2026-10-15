import { EnquiryCategory, EnquiryStatus } from "./types";

export const ENQUIRY_CATEGORY_LABELS: Record<EnquiryCategory, string> = {
  NOISE: "Noise",
  TRAFFIC: "Traffic",
  DUST: "Dust",
  ACCESS: "Access",
  OTHER: "Other",
};

export const ALL_ENQUIRY_CATEGORIES: EnquiryCategory[] = [
  "NOISE",
  "TRAFFIC",
  "DUST",
  "ACCESS",
  "OTHER",
];

export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const ENQUIRY_STATUS_COLORS: Record<EnquiryStatus, string> = {
  OPEN: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  IN_PROGRESS: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  RESOLVED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  CLOSED: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export const ALL_ENQUIRY_STATUSES: EnquiryStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

const STATUS_RANK: Record<EnquiryStatus, number> = {
  OPEN: 0,
  IN_PROGRESS: 1,
  RESOLVED: 2,
  CLOSED: 3,
};

// Sorts the most-outstanding enquiries first: a freshly-received complaint
// needs a response before an in-progress one, with resolved/closed
// enquiries — the terminal states — sinking to the bottom.
export function enquiryStatusRank(status: EnquiryStatus): number {
  return STATUS_RANK[status];
}
