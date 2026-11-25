import { describe, expect, it } from "vitest";
import { formatVersion } from "./version";

describe("formatVersion", () => {
  it("shows Section.Feature.Fix as is", () => {
    expect(formatVersion("2.6.1")).toBe("2.6.1");
    expect(formatVersion("2.10.0")).toBe("2.10.0");
    expect(formatVersion("3.0.0")).toBe("3.0.0");
  });

  it("drops anything after the three numbers and leaves other text alone", () => {
    expect(formatVersion("2.6.1-beta")).toBe("2.6.1");
    expect(formatVersion("dev")).toBe("dev");
  });
});
