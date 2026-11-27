import { describe, expect, it } from "vitest";
import { fyMonthSlots } from "./monthlyReport/projectImport";

describe("fyMonthSlots", () => {
  it("maps a November report onto July-June, with actuals up to November", () => {
    const { current, next } = fyMonthSlots("2026-11");
    expect(current[0]).toEqual({ year: 2026, month: 7, actual: true });
    expect(current[4]).toEqual({ year: 2026, month: 11, actual: true });
    expect(current[5]).toEqual({ year: 2026, month: 12, actual: false });
    expect(current[11]).toEqual({ year: 2027, month: 6, actual: false });
    expect(next[0]).toEqual({ year: 2027, month: 7, actual: false });
    expect(next[11]).toEqual({ year: 2028, month: 6, actual: false });
  });

  it("puts a March report in the financial year that started the July before", () => {
    const { current } = fyMonthSlots("2027-03");
    expect(current[0]).toEqual({ year: 2026, month: 7, actual: true });
    expect(current[8]).toEqual({ year: 2027, month: 3, actual: true });
    expect(current[9]).toEqual({ year: 2027, month: 4, actual: false });
  });
});
