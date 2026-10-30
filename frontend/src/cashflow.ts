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

// The cash flow entries for the `months` calendar months nearest the current
// month (ties go to the earlier month, so recent actuals win over far
// forecasts), in their original order. Used for the Cash Flow list's
// collapsed view: the latest actuals and the next forecasts, rather than the
// first few months of the project.
export function entriesNearestNow(
  entries: CashFlowEntry[],
  months: number,
  now: Date = new Date()
): CashFlowEntry[] {
  const monthIndex = (key: string) => {
    const [y, m] = key.substring(0, 7).split("-").map(Number);
    return y * 12 + (m - 1);
  };
  const current = now.getFullYear() * 12 + now.getMonth();
  const keys = Array.from(new Set(entries.map((e) => e.month.substring(0, 7))));
  const nearest = new Set(
    keys
      .sort((a, b) => {
        const da = Math.abs(monthIndex(a) - current);
        const db = Math.abs(monthIndex(b) - current);
        return da - db || monthIndex(a) - monthIndex(b);
      })
      .slice(0, months)
  );
  return entries.filter((e) => nearest.has(e.month.substring(0, 7)));
}
