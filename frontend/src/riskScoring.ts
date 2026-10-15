import { RiskConsequence, RiskLikelihood } from "./types";

// A standard 5x5 risk matrix: each enum value maps to a 1-5 scale, and
// likelihood x consequence gives a score from 1 to 25. The band cutoffs
// below are one common convention (not a regulatory standard) — adjust
// here if GVW's own risk procedure uses different thresholds.
export const LIKELIHOOD_VALUES: Record<RiskLikelihood, number> = {
  RARE: 1,
  UNLIKELY: 2,
  POSSIBLE: 3,
  LIKELY: 4,
  ALMOST_CERTAIN: 5,
};

export const CONSEQUENCE_VALUES: Record<RiskConsequence, number> = {
  INSIGNIFICANT: 1,
  MINOR: 2,
  MODERATE: 3,
  MAJOR: 4,
  SEVERE: 5,
};

export const LIKELIHOOD_LABELS: Record<RiskLikelihood, string> = {
  RARE: "Rare",
  UNLIKELY: "Unlikely",
  POSSIBLE: "Possible",
  LIKELY: "Likely",
  ALMOST_CERTAIN: "Almost Certain",
};

export const CONSEQUENCE_LABELS: Record<RiskConsequence, string> = {
  INSIGNIFICANT: "Insignificant",
  MINOR: "Minor",
  MODERATE: "Moderate",
  MAJOR: "Major",
  SEVERE: "Severe",
};

export const ALL_LIKELIHOODS: RiskLikelihood[] = [
  "RARE",
  "UNLIKELY",
  "POSSIBLE",
  "LIKELY",
  "ALMOST_CERTAIN",
];

export const ALL_CONSEQUENCES: RiskConsequence[] = [
  "INSIGNIFICANT",
  "MINOR",
  "MODERATE",
  "MAJOR",
  "SEVERE",
];

export type RiskBand = "Low" | "Medium" | "High" | "Critical";

export function riskScore(
  likelihood: RiskLikelihood,
  consequence: RiskConsequence
): number {
  return LIKELIHOOD_VALUES[likelihood] * CONSEQUENCE_VALUES[consequence];
}

export function riskBand(score: number): RiskBand {
  if (score >= 16) return "Critical";
  if (score >= 10) return "High";
  if (score >= 5) return "Medium";
  return "Low";
}

export const RISK_BAND_COLORS: Record<RiskBand, string> = {
  Low: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  Medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  High: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  Critical: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};
