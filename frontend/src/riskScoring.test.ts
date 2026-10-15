import { describe, expect, it } from "vitest";
import { riskBand, riskScore } from "./riskScoring";

describe("risk scoring", () => {
  it("multiplies likelihood by consequence", () => {
    expect(riskScore("RARE", "INSIGNIFICANT")).toBe(1);
    expect(riskScore("POSSIBLE", "MAJOR")).toBe(12);
    expect(riskScore("ALMOST_CERTAIN", "SEVERE")).toBe(25);
  });

  it("bands scores at the documented boundaries", () => {
    expect(riskBand(4)).toBe("Low");
    expect(riskBand(5)).toBe("Medium");
    expect(riskBand(9)).toBe("Medium");
    expect(riskBand(10)).toBe("High");
    expect(riskBand(15)).toBe("High");
    expect(riskBand(16)).toBe("Critical");
  });
});
