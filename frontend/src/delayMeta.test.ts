import { describe, expect, it } from "vitest";
import { criticalPathDelayDays, delayDays, totalDelayDays } from "./delayMeta";
import type { Delay } from "./types";

const delay = (over: Partial<Delay>) =>
  ({ daysImpact: null, dateStarted: "2026-06-01T00:00:00Z", dateEnded: null, criticalPath: false, ...over }) as unknown as Delay;
const NOW = new Date("2026-06-11T00:00:00Z");

describe("delay days", () => {
  it("prefers the entered estimate", () => {
    expect(delayDays(delay({ daysImpact: 3 }), NOW)).toBe(3);
  });

  it("falls back to elapsed days, to the end date when resolved", () => {
    expect(delayDays(delay({ dateEnded: "2026-06-06T00:00:00Z" }), NOW)).toBe(5);
  });

  it("counts an ongoing delay up to today", () => {
    expect(delayDays(delay({}), NOW)).toBe(10);
  });

  it("never goes negative", () => {
    expect(delayDays(delay({ dateStarted: "2026-07-01T00:00:00Z" }), NOW)).toBe(0);
  });

  it("totals all delays and just the critical-path ones", () => {
    const list = [delay({ daysImpact: 4, criticalPath: true }), delay({ daysImpact: 6 })];
    expect(totalDelayDays(list, NOW)).toBe(10);
    expect(criticalPathDelayDays(list, NOW)).toBe(4);
  });
});
