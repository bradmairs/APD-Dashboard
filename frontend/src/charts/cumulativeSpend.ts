import { CashFlowEntry } from "../types";

export function toMonthKey(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

export function addMonths(monthKey: string, n: number): string {
  const d = new Date(monthKey);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)
  ).toISOString();
}

export function monthLabel(monthKey: string): string {
  return new Date(monthKey).toLocaleDateString("en-AU", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

export function buildMonthRange(rangeStart: string, rangeEnd: string): string[] {
  const months: string[] = [];
  let cursor = rangeStart;
  const end = rangeEnd < rangeStart ? rangeStart : rangeEnd;
  for (let i = 0; i < 600 && cursor <= end; i++) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  return months;
}

// A single project's monthly contribution: the amount actually spent for a
// month it's been recorded for, falling back to that month's forecast if no
// actual has landed yet — a forecast entered ahead of time is superseded by
// its own project's actual once that closes, but never by another project's.
export function monthlyContributions(entries: CashFlowEntry[]): Map<string, number> {
  const byMonth = new Map<string, { actual?: number; forecast?: number }>();
  for (const entry of entries) {
    const bucket = byMonth.get(entry.month) || {};
    if (entry.type === "ACTUAL") bucket.actual = Number(entry.amount);
    else bucket.forecast = Number(entry.amount);
    byMonth.set(entry.month, bucket);
  }
  const contributions = new Map<string, number>();
  for (const [month, bucket] of byMonth) {
    contributions.set(month, bucket.actual ?? bucket.forecast ?? 0);
  }
  return contributions;
}

// The latest month any of a project's entries recorded an Actual — used to
// mark where the solid Actual line ends and the dashed Forecast line begins.
export function lastActualMonth(entries: CashFlowEntry[]): string | null {
  const actualMonths = entries.filter((e) => e.type === "ACTUAL").map((e) => e.month);
  return actualMonths.length === 0 ? null : actualMonths.sort().slice(-1)[0];
}

export function sumContributions(maps: Map<string, number>[]): Map<string, number> {
  const merged = new Map<string, number>();
  for (const map of maps) {
    for (const [month, amount] of map) {
      merged.set(month, (merged.get(month) ?? 0) + amount);
    }
  }
  return merged;
}

export interface CumulativeSeries {
  months: string[];
  cumulative: number[];
  lastActualIndex: number;
}

// Turns a month->contribution map plus the latest "actual" month into the
// running cumulative series the chart plots, over an explicit month range
// (the range itself comes from project dates, which the contributions map
// alone can't tell you: an S-curve should still show a project's full
// planned timeframe even for months with no entry yet).
export function buildCumulativeSeries(
  months: string[],
  contributions: Map<string, number>,
  lastActual: string | null
): CumulativeSeries {
  let running = 0;
  const cumulative = months.map((month) => {
    running += contributions.get(month) ?? 0;
    return running;
  });
  const lastActualIndex = lastActual ? months.indexOf(lastActual) : -1;
  return { months, cumulative, lastActualIndex };
}
