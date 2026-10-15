import { Subcontractor, SubcontractorStatus } from "./types";

export const SUBCONTRACTOR_STATUS_LABELS: Record<SubcontractorStatus, string> = {
  ENGAGED: "Engaged",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  TERMINATED: "Terminated",
};

export const SUBCONTRACTOR_STATUS_COLORS: Record<SubcontractorStatus, string> = {
  ENGAGED: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  COMPLETED: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  TERMINATED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export const ALL_SUBCONTRACTOR_STATUSES: SubcontractorStatus[] = [
  "ENGAGED",
  "ACTIVE",
  "COMPLETED",
  "TERMINATED",
];

export const TRADE_SUGGESTIONS = [
  "Civil",
  "Electrical",
  "Mechanical",
  "Plumbing",
  "Concreting",
  "Earthworks",
];

const STATUS_RANK: Record<SubcontractorStatus, number> = {
  ACTIVE: 0,
  ENGAGED: 1,
  COMPLETED: 2,
  TERMINATED: 3,
};

// Sorts currently-on-site subcontractors first (Active, then Engaged but
// not yet started), with Completed/Terminated — the terminal states —
// sinking to the bottom.
export function subcontractorStatusRank(status: SubcontractorStatus): number {
  return STATUS_RANK[status];
}

const EXPIRING_SOON_DAYS = 60;

// Mirrors permitMeta.ts's isPermitExpired/isPermitExpiringSoon: computed
// from the date against the current time rather than stored, so it never
// drifts stale. Only an Engaged or Active subcontractor's insurance still
// matters — a Completed or Terminated one is no longer on site.
export function isSubcontractorInsuranceExpired(subcontractor: Subcontractor): boolean {
  if (!subcontractor.insuranceExpiry) return false;
  if (subcontractor.status !== "ENGAGED" && subcontractor.status !== "ACTIVE") return false;
  return new Date(subcontractor.insuranceExpiry) < new Date();
}

export function isSubcontractorInsuranceExpiringSoon(
  subcontractor: Subcontractor,
  withinDays = EXPIRING_SOON_DAYS
): boolean {
  if (!subcontractor.insuranceExpiry) return false;
  if (subcontractor.status !== "ENGAGED" && subcontractor.status !== "ACTIVE") return false;
  if (isSubcontractorInsuranceExpired(subcontractor)) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);
  return new Date(subcontractor.insuranceExpiry) <= cutoff;
}
