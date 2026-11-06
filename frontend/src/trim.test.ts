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

  it("links network paths and app links", () => {
    expect(trimHref("\\\\gvw-fs01\\Projects\\SPS02 Design")).toBe(
      "file://gvw-fs01/Projects/SPS02%20Design"
    );
    expect(trimHref("trim:?uri=12345")).toBe("trim:?uri=12345");
    expect(trimHref("file://gvw-fs01/Projects")).toBe("file://gvw-fs01/Projects");
  });

  it("links record numbers through the configured TRIM address", () => {
    const template = "https://trim.gvw.local/CMWebClient/Record?uri={record}";
    expect(trimHref("D24/12345", template)).toBe(
      "https://trim.gvw.local/CMWebClient/Record?uri=D24%2F12345"
    );
    expect(trimHref("D24/12345")).toBeNull();
  });

  it("never links script schemes or plain text", () => {
    expect(trimHref("javascript:alert(1)")).toBeNull();
    expect(trimHref("JavaScript:alert(1)", "https://x/{record}")).toBeNull();
    expect(trimHref("data:text/html,hi")).toBeNull();
    expect(trimHref("Some folder name", "https://x/{record}")).toBeNull();
    expect(trimHref(null)).toBeNull();
  });
});
