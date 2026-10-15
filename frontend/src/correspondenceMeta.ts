import { Correspondence, CorrespondenceDirection, CorrespondenceStatus } from "./types";

export const CORRESPONDENCE_DIRECTION_LABELS: Record<CorrespondenceDirection, string> = {
  INCOMING: "Incoming",
  OUTGOING: "Outgoing",
};

export const ALL_CORRESPONDENCE_DIRECTIONS: CorrespondenceDirection[] = ["INCOMING", "OUTGOING"];

export const CORRESPONDENCE_STATUS_LABELS: Record<CorrespondenceStatus, string> = {
  OPEN: "Open",
  CLOSED: "Closed",
};

export const CORRESPONDENCE_STATUS_COLORS: Record<CorrespondenceStatus, string> = {
  OPEN: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  CLOSED: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export const ALL_CORRESPONDENCE_STATUSES: CorrespondenceStatus[] = ["OPEN", "CLOSED"];

const STATUS_RANK: Record<CorrespondenceStatus, number> = {
  OPEN: 0,
  CLOSED: 1,
};

// Sorts open correspondence ahead of closed — the terminal state — the
// same status-rank pattern every other register uses.
export function correspondenceStatusRank(status: CorrespondenceStatus): number {
  return STATUS_RANK[status];
}

// responseDueDate is the contractually meaningful deadline — the same role
// Rfi.dateRequired plays for RFIs. Only an Open item can be overdue or due
// soon; once closed, the deadline no longer matters.
export function isCorrespondenceOverdue(item: Correspondence): boolean {
  if (!item.responseDueDate || item.status !== "OPEN") return false;
  return new Date(item.responseDueDate) < new Date();
}

export function isCorrespondenceDueSoon(item: Correspondence, withinDays = 7): boolean {
  if (!item.responseDueDate || item.status !== "OPEN" || isCorrespondenceOverdue(item)) {
    return false;
  }
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);
  return new Date(item.responseDueDate) <= cutoff;
}
