import { PerformanceReview } from "./types";

export const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Below Expectations",
  3: "Satisfactory",
  4: "Good",
  5: "Excellent",
};

export const ALL_RATINGS = [1, 2, 3, 4, 5];

// The overall score is computed client-side as the average of the four
// dimension ratings — never stored — the same computed-not-stored pattern
// Risk's likelihood x consequence score uses.
export function overallScore(review: PerformanceReview): number {
  const total =
    review.qualityRating +
    review.safetyRating +
    review.timelinessRating +
    review.communicationRating;
  return total / 4;
}

export type PerformanceBand = "Needs Improvement" | "Satisfactory" | "Good" | "Excellent";

export function performanceBand(score: number): PerformanceBand {
  if (score < 2.5) return "Needs Improvement";
  if (score < 3.5) return "Satisfactory";
  if (score < 4.5) return "Good";
  return "Excellent";
}

export const PERFORMANCE_BAND_COLORS: Record<PerformanceBand, string> = {
  "Needs Improvement": "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  Satisfactory: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Good: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  Excellent: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

const LOW_SCORE_THRESHOLD = 2.5;

// Flags a review as needing attention on the portfolio-wide dashboard
// panel — anything scoring below "Satisfactory".
export function isLowPerforming(review: PerformanceReview): boolean {
  return overallScore(review) < LOW_SCORE_THRESHOLD;
}
