import { TrainingRecord } from "./types";

// Suggestions only — trainingType is freeform text, the same
// suggest-but-don't-constrain pattern DocumentRecord uses for category.
export const TRAINING_TYPE_SUGGESTIONS: string[] = [
  "Site Induction",
  "White Card",
  "Working at Heights",
  "Confined Space",
  "First Aid",
  "Traffic Control",
  "Water Industry Safety Induction",
];

const EXPIRING_SOON_DAYS = 60;

// A training record's "expiring soon"/"expired" state is computed from its
// expiry date against the current time rather than stored, the same
// reasoning as isInsuranceWarrantyExpired/isInsuranceWarrantyExpiringSoon.
// expiryDate is optional — a one-off record like a site induction may never
// expire, in which case it's never flagged.
export function isTrainingExpired(record: TrainingRecord): boolean {
  if (!record.expiryDate) return false;
  return new Date(record.expiryDate) < new Date();
}

export function isTrainingExpiringSoon(
  record: TrainingRecord,
  withinDays = EXPIRING_SOON_DAYS
): boolean {
  if (!record.expiryDate || isTrainingExpired(record)) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);
  return new Date(record.expiryDate) <= cutoff;
}

// Sorts expired records first, then expiring soon, then everything else —
// the same status-rank pattern every other register uses, adapted for a
// register with no status field.
export function trainingExpiryRank(record: TrainingRecord): number {
  if (isTrainingExpired(record)) return 0;
  if (isTrainingExpiringSoon(record)) return 1;
  return 2;
}
