import { describe, expect, it } from "vitest";
import { trimHref } from "./trim";

describe("trimHref", () => {
  it("links http(s) locations", () => {
    expect(trimHref(" https://trim.example/record/123 ")).toBe("https://trim.example/record/123");
    expect(trimHref("http://trim/x")).toBe("http://trim/x");
  });

  it("leaves record numbers and unsafe schemes as plain text", () => {
    expect(trimHref("D24/12345")).toBeNull();
    expect(trimHref("javascript:alert(1)")).toBeNull();
    expect(trimHref(null)).toBeNull();
  });
});
