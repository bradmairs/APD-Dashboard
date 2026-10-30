import { describe, expect, it } from "vitest";
import { stripFormatting } from "./plainText";

describe("stripFormatting", () => {
  it("removes formatting markers and keeps bullets readable", () => {
    expect(stripFormatting("**Agreed:** pour on *Friday*\n- __crane__ booked\n1. sign off")).toBe(
      "Agreed: pour on Friday\n• crane booked\n1. sign off"
    );
  });

  it("leaves plain text alone", () => {
    expect(stripFormatting("Rate 5 * 3, see section_2")).toBe("Rate 5 * 3, see section_2");
  });
});
