import { describe, expect, it } from "vitest";
import { isBatchablePath } from "./routes/batch";

describe("isBatchablePath", () => {
  it("allows this app's own GET paths", () => {
    expect(isBatchablePath("/api/projects")).toBe(true);
    expect(isBatchablePath("/api/projects/abc123/tasks")).toBe(true);
    expect(isBatchablePath("/api/tasks/upcoming")).toBe(true);
    expect(isBatchablePath("/api/risks?projectId=abc")).toBe(true);
  });

  it("refuses anything else", () => {
    expect(isBatchablePath("http://evil.example/api/x")).toBe(false);
    expect(isBatchablePath("//evil.example/api")).toBe(false);
    expect(isBatchablePath("/api/../etc/passwd")).toBe(false);
    expect(isBatchablePath("/api//projects")).toBe(false);
    expect(isBatchablePath("/api/batch?p=/api/x")).toBe(false);
    expect(isBatchablePath("/api/auth/me")).toBe(false);
    expect(isBatchablePath("/other")).toBe(false);
    expect(isBatchablePath("/api/x#frag")).toBe(false);
    expect(isBatchablePath(42)).toBe(false);
  });
});
