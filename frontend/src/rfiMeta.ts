import { Rfi, RfiStatus } from "./types";

export const RFI_STATUS_LABELS: Record<RfiStatus, string> = {
  OPEN: "Open",
  ANSWERED: "Answered",
  CLOSED: "Closed",
};

export const RFI_STATUS_COLORS: Record<RfiStatus, string> = {
  OPEN: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  ANSWERED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  CLOSED: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export const ALL_RFI_STATUSES: RfiStatus[] = ["OPEN", "ANSWERED", "CLOSED"];

const STATUS_RANK: Record<RfiStatus, number> = {
  OPEN: 0,
  ANSWERED: 1,
  CLOSED: 2,
};

// Sorts the most outstanding RFIs first: open ones (awaiting a
// response) ahead of answered (awaiting close-out), with closed —
// the terminal state — sinking last.
export function rfiStatusRank(status: RfiStatus): number {
  return STATUS_RANK[status];
}

// dateRequired is the contractually meaningful deadline — the date a
// response is due — distinct from dateRaised, the same role
// Task.dueDate plays for tasks. Only an OPEN RFI can be overdue or due
// soon; once answered or closed, the deadline no longer matters.
export function isRfiOverdue(rfi: Rfi): boolean {
  if (!rfi.dateRequired || rfi.status !== "OPEN") return false;
  return new Date(rfi.dateRequired) < new Date();
}

export function isRfiDueSoon(rfi: Rfi, withinDays = 7): boolean {
  if (!rfi.dateRequired || rfi.status !== "OPEN" || isRfiOverdue(rfi)) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);
  return new Date(rfi.dateRequired) <= cutoff;
}
