import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

// The dashboard has one version, in /VERSION (Section.Feature.Fix, see
// docs/releases.md). scripts/bump-version.sh writes it everywhere; this
// catches a hand edit that missed a spot, or a bump without release notes.
const root = join(__dirname, "..", "..");
const version = readFileSync(join(root, "VERSION"), "utf8").trim();

describe("version", () => {
  it("is Section.Feature.Fix", () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("matches both package.json files", () => {
    for (const app of ["backend", "frontend"]) {
      const pkg = JSON.parse(readFileSync(join(root, app, "package.json"), "utf8"));
      expect(pkg.version, `${app}/package.json`).toBe(version);
    }
  });

  it("has release notes", () => {
    expect(() => readFileSync(join(root, "docs", "releases", `${version}.md`), "utf8")).not.toThrow();
  });
});
