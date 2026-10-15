import { describe, expect, it } from "vitest";
import { rankResults, relevanceScore } from "./searchRank";

const r = (type: string, title: string, subtitle: string | null = null, date = "2026-01-01") => ({
  type,
  title,
  subtitle,
  date: new Date(date),
});

describe("relevanceScore", () => {
  it("orders exact > prefix > word-start > substring > subtitle > other", () => {
    const scores = [
      relevanceScore(r("a", "pump"), "pump"),
      relevanceScore(r("a", "pump station"), "pump"),
      relevanceScore(r("a", "main pump house"), "pump"),
      relevanceScore(r("a", "centrifugalpump"), "pump"),
      relevanceScore(r("a", "Mechanical", "pump supplier"), "pump"),
      relevanceScore(r("a", "Mechanical", null), "pump"),
    ];
    expect(scores).toEqual([...scores].sort((x, y) => y - x));
    expect(new Set(scores).size).toBe(scores.length);
  });
});

describe("rankResults", () => {
  it("finds an exact match even when it is older than weaker matches", () => {
    const results = [
      r("rfi", "Pump station layout", null, "2026-03-01"),
      r("rfi", "Pump", null, "2025-01-01"),
    ];
    expect(rankResults(results, "pump", 5)[0].title).toBe("Pump");
  });

  it("caps each type and puts the register with the best hit first", () => {
    const results = [
      r("risk", "Flood pump failure"),
      r("rfi", "pump"),
      r("rfi", "pump a"),
      r("rfi", "pump b"),
    ];
    const ranked = rankResults(results, "pump", 2);
    expect(ranked.map((x) => x.type)).toEqual(["rfi", "rfi", "risk"]);
  });
});
