import { describe, expect, it } from "vitest";
import { entriesNearestNow } from "./cashflow";
import { CashFlowEntry } from "./types";

function entry(month: string, type: "ACTUAL" | "FORECAST"): CashFlowEntry {
  return { id: `${month}-${type}`, month: `${month}-01T00:00:00.000Z`, type, amount: "1" } as CashFlowEntry;
}

describe("entriesNearestNow", () => {
  const entries = [
    entry("2026-01", "ACTUAL"),
    entry("2026-04", "ACTUAL"),
    entry("2026-07", "ACTUAL"),
    entry("2026-08", "ACTUAL"),
    entry("2026-09", "ACTUAL"),
    entry("2026-10", "FORECAST"),
    entry("2026-10", "ACTUAL"),
    entry("2026-11", "FORECAST"),
    entry("2026-12", "FORECAST"),
    entry("2027-06", "FORECAST"),
  ];
  const now = new Date(2026, 9, 30); // 30 Oct 2026

  it("keeps the five months around the current month, both entries of a month, in order", () => {
    expect(entriesNearestNow(entries, 5, now).map((e) => e.id)).toEqual([
      "2026-08-ACTUAL",
      "2026-09-ACTUAL",
      "2026-10-FORECAST",
      "2026-10-ACTUAL",
      "2026-11-FORECAST",
      "2026-12-FORECAST",
    ]);
  });

  it("falls back to the most recent months for a finished project", () => {
    const old = entries.slice(0, 5);
    expect(entriesNearestNow(old, 3, now).map((e) => e.id)).toEqual([
      "2026-07-ACTUAL",
      "2026-08-ACTUAL",
      "2026-09-ACTUAL",
    ]);
  });
});
