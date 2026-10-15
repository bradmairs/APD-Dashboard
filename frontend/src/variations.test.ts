import { describe, expect, it } from "vitest";
import { approvedVariationsTotal, effectiveBudget, revisedBudget } from "./variations";
import type { Variation } from "./types";

const variation = (status: string, costImpact: string) => ({ status, costImpact }) as unknown as Variation;

describe("variations budget maths", () => {
  const variations = [variation("APPROVED", "1000"), variation("APPROVED", "-250"), variation("PROPOSED", "9999"), variation("REJECTED", "5000")];

  it("only counts approved variations", () => {
    expect(approvedVariationsTotal(variations)).toBe(750);
  });

  it("revises the original budget by approved variations", () => {
    expect(revisedBudget({ budget: "10000" }, variations)).toBe(10750);
  });

  it("returns null when there is no budget to revise", () => {
    expect(revisedBudget({ budget: null }, variations)).toBeNull();
  });

  it("prefers the latest approved budget over the revised original", () => {
    expect(effectiveBudget({ budget: "10000", latestApprovedBudget: "12000" }, variations)).toBe(12000);
  });

  it("falls back to the revised original when no latest approved budget is set", () => {
    expect(effectiveBudget({ budget: "10000", latestApprovedBudget: null }, variations)).toBe(10750);
  });
});
