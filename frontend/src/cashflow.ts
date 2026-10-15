import { CashFlowEntry } from "./types";

export function expenditureToDate(entries: CashFlowEntry[]): number {
  return entries
    .filter((e) => e.type === "ACTUAL")
    .reduce((sum, e) => sum + Number(e.amount), 0);
}

// The Estimate at Completion: actual spend plus what's still forecast for
// the rest of the project. Summing every ACTUAL and every FORECAST entry
// independently double-counts any month that has both — a forecast entered
// ahead of time is normally left in place after its own actual lands, the
// same way the cumulative-spend S-curve treats it (see
// charts/cumulativeSpend.ts's monthlyContributions) — so this applies the
// same "actual supersedes that month's forecast" rule before summing.
export function forecastAtCompletion(entries: CashFlowEntry[]): number {
  const byMonth = new Map<string, { actual?: number; forecast?: number }>();
  for (const entry of entries) {
    const bucket = byMonth.get(entry.month) || {};
    if (entry.type === "ACTUAL") bucket.actual = Number(entry.amount);
    else bucket.forecast = Number(entry.amount);
    byMonth.set(entry.month, bucket);
  }
  let total = 0;
  for (const { actual, forecast } of byMonth.values()) {
    total += actual ?? forecast ?? 0;
  }
  return total;
}
