import { EnvironmentalMonitoringRecord, LimitType } from "./types";

// Suggestions only — parameter is freeform text, the same
// suggest-but-don't-constrain pattern DocumentRecord uses for category.
export const PARAMETER_SUGGESTIONS: string[] = [
  "Noise",
  "Dust / Particulates (PM10)",
  "Turbidity",
  "Vibration",
  "Groundwater Level",
  "pH",
  "Erosion & Sediment Control",
];

export const LIMIT_TYPE_LABELS: Record<LimitType, string> = {
  MAX: "Must not exceed",
  MIN: "Must not fall below",
};

// A reading's exceedance is computed from readingValue vs limitValue/
// limitType rather than stored, the same computed-not-stored pattern as
// isTrainingExpired/isInsuranceWarrantyExpired. limitValue is optional —
// some readings are recorded for information only, with no licence
// condition attached, in which case they can never be flagged.
export function isExceedance(record: EnvironmentalMonitoringRecord): boolean {
  if (record.limitValue === null) return false;
  return record.limitType === "MAX"
    ? record.readingValue > record.limitValue
    : record.readingValue < record.limitValue;
}

// Sorts exceedances first, then everything else, most recent first within
// each group — the same status-rank pattern every other register uses,
// adapted for a register with no status field.
export function environmentalMonitoringRank(record: EnvironmentalMonitoringRecord): number {
  return isExceedance(record) ? 0 : 1;
}
