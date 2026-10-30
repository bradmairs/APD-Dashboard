import { describe, expect, it } from "vitest";
import { trimHref } from "./trim";

describe("trimHref", () => {
  it("links http(s) locations", () => {
    expect(trimHref(" https://trim.example/record/123 ")).toBe("https://trim.example/record/123");
    expect(trimHref("http://trim/x")).toBe("http://trim/x");
  });

  it("links web addresses pasted without a scheme", () => {
    expect(trimHref("www.gvw.com.au/design-guidelines")).toBe(
      "https://www.gvw.com.au/design-guidelines"
    );
    expect(trimHref("trim.gvw.local:8080/record/55")).toBe("https://trim.gvw.local:8080/record/55");
  });

  it("leaves record numbers and unsafe schemes as plain text", () => {
    expect(trimHref("D24/12345")).toBeNull();
    expect(trimHref("CW-2026-014")).toBeNull();
    expect(trimHref("javascript:alert(1)")).toBeNull();
    expect(trimHref("data:text/html,hi")).toBeNull();
    expect(trimHref("Some folder name")).toBeNull();
    expect(trimHref(null)).toBeNull();
  });
});
