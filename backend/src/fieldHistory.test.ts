import { describe, expect, it } from "vitest";
import { changedFields } from "./fieldHistory";

describe("changedFields", () => {
  it("lists only fields that changed, as display text", () => {
    const before = { name: "A", budget: "950000.00", startDate: new Date("2026-01-05T00:00:00Z"), status: "DESIGN" };
    const after = { name: "A", budget: 1100000, startDate: "2026-02-01T00:00:00.000Z" };
    expect(changedFields(before, after, ["name", "budget", "startDate", "status"])).toEqual([
      { field: "budget", oldValue: "950000.00", newValue: "1100000" },
      { field: "startDate", oldValue: "2026-01-05", newValue: "2026-02-01" },
    ]);
  });

  it("treats equal numbers in different forms as unchanged", () => {
    expect(changedFields({ budget: "950000.00" }, { budget: 950000 }, ["budget"])).toEqual([]);
  });

  it("records clearing a value", () => {
    expect(changedFields({ location: "Shepparton" }, { location: "" }, ["location"])).toEqual([
      { field: "location", oldValue: "Shepparton", newValue: null },
    ]);
  });
});
