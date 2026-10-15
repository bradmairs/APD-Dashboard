import { Delay, DelayStatus } from "./types";

export const DELAY_STATUS_LABELS: Record<DelayStatus, string> = {
  ONGOING: "Ongoing",
  RESOLVED: "Resolved",
};

export const DELAY_STATUS_COLORS: Record<DelayStatus, string> = {
  ONGOING: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  RESOLVED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

export const ALL_DELAY_STATUSES: DelayStatus[] = ["ONGOING", "RESOLVED"];

export const DELAY_CATEGORY_SUGGESTIONS = [
  "Weather",
  "Design / Information",
  "Client / Approvals",
  "Contractor",
  "Supply Chain / Materials",
  "Latent Conditions",
  "Third Party / Utilities",
  "Industrial Action",
  "Other",
];

export const DELAY_RESPONSIBLE_SUGGESTIONS = ["Client", "Contractor", "Designer", "Third party", "Neutral event"];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// The days a delay cost: the PM's own estimate when entered, otherwise the
// calendar days elapsed from the start to the end date (or to today while
// it's still ongoing). Never negative.
export function delayDays(delay: Pick<Delay, "daysImpact" | "dateStarted" | "dateEnded">, now: Date = new Date()): number {
  if (delay.daysImpact !== null) return delay.daysImpact;
  const end = delay.dateEnded ? new Date(delay.dateEnded) : now;
  const days = Math.round((end.getTime() - new Date(delay.dateStarted).getTime()) / MS_PER_DAY);
  return Math.max(0, days);
}

export function totalDelayDays(delays: Delay[], now: Date = new Date()): number {
  return delays.reduce((sum, d) => sum + delayDays(d, now), 0);
}

export function criticalPathDelayDays(delays: Delay[], now: Date = new Date()): number {
  return delays.filter((d) => d.criticalPath).reduce((sum, d) => sum + delayDays(d, now), 0);
}
