import { DocumentStatus } from "./types";

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  DRAFT: "Draft",
  FOR_REVIEW: "For Review",
  APPROVED: "Approved",
  SUPERSEDED: "Superseded",
};

export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  FOR_REVIEW: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  SUPERSEDED: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
};

export const ALL_DOCUMENT_STATUSES: DocumentStatus[] = [
  "DRAFT",
  "FOR_REVIEW",
  "APPROVED",
  "SUPERSEDED",
];

export const DOCUMENT_CATEGORY_SUGGESTIONS = [
  "Drawing",
  "Specification",
  "Report",
  "Correspondence",
  "As-Built",
];

const STATUS_RANK: Record<DocumentStatus, number> = {
  FOR_REVIEW: 0,
  DRAFT: 1,
  APPROVED: 2,
  SUPERSEDED: 3,
};

// Sorts documents awaiting action first (out for review, then still in
// draft), with approved (current, in-use) documents next and superseded
// (historical) revisions sinking to the bottom.
export function documentStatusRank(status: DocumentStatus): number {
  return STATUS_RANK[status];
}
