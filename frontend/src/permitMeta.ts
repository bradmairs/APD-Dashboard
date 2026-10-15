import { Permit, PermitStatus } from "./types";

export const PERMIT_STATUS_LABELS: Record<PermitStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const PERMIT_STATUS_COLORS: Record<PermitStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export const ALL_PERMIT_STATUSES: PermitStatus[] = ["PENDING", "APPROVED", "REJECTED"];

const EXPIRING_SOON_DAYS = 60;

// A permit's "expiring soon"/"expired" state is computed from its expiry
// date against the current time rather than stored — the same reasoning
// as isProjectOverdue — so it never drifts stale. Only an Approved permit
// can meaningfully expire; a Pending or Rejected one was never in force.
export function isPermitExpired(permit: Permit): boolean {
  if (!permit.expiryDate || permit.status !== "APPROVED") return false;
  return new Date(permit.expiryDate) < new Date();
}

export function isPermitExpiringSoon(permit: Permit, withinDays = EXPIRING_SOON_DAYS): boolean {
  if (!permit.expiryDate || permit.status !== "APPROVED" || isPermitExpired(permit)) {
    return false;
  }
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);
  return new Date(permit.expiryDate) <= cutoff;
}
