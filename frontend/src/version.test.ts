import { describe, expect, it } from "vitest";
import { formatVersion } from "./version";

describe("formatVersion", () => {
  it("maps semver to the X.YY release names used in the changelog", () => {
    expect(formatVersion("1.0.0")).toBe("1.0");
    expect(formatVersion("1.0.1")).toBe("1.01");
    expect(formatVersion("1.1.0")).toBe("1.1");
    expect(formatVersion("1.2.1")).toBe("1.21");
    expect(formatVersion("1.2.2")).toBe("1.22");
    expect(formatVersion("2.0.0")).toBe("2.0");
  });

  it("leaves anything unexpected alone", () => {
    expect(formatVersion("dev")).toBe("dev");
  });
});
