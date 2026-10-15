import { InsuranceWarranty, InsuranceWarrantyType } from "./types";

export const INSURANCE_WARRANTY_TYPE_LABELS: Record<InsuranceWarrantyType, string> = {
  INSURANCE: "Insurance",
  WARRANTY: "Warranty",
};

export const INSURANCE_WARRANTY_TYPE_COLORS: Record<InsuranceWarrantyType, string> = {
  INSURANCE: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  WARRANTY: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
};

export const ALL_INSURANCE_WARRANTY_TYPES: InsuranceWarrantyType[] = ["INSURANCE", "WARRANTY"];

const EXPIRING_SOON_DAYS = 60;

// An insurance/warranty item's "expiring soon"/"expired" state is
// computed from its expiry date against the current time rather than
// stored — the same reasoning as isPermitExpired/isPermitExpiringSoon —
// so it never drifts stale. Unlike a permit there's no status gate:
// a policy or warranty is in force from the moment it's entered.
export function isInsuranceWarrantyExpired(item: InsuranceWarranty): boolean {
  if (!item.expiryDate) return false;
  return new Date(item.expiryDate) < new Date();
}

export function isInsuranceWarrantyExpiringSoon(
  item: InsuranceWarranty,
  withinDays = EXPIRING_SOON_DAYS
): boolean {
  if (!item.expiryDate || isInsuranceWarrantyExpired(item)) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);
  return new Date(item.expiryDate) <= cutoff;
}
