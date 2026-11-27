import { existsSync, readFileSync } from "fs";
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

  // The "What's new" pop-up (frontend/src/whatsNew/whatsNew.md) is written
  // for the people using the dashboard, not the server admin.
  describe("What's new pop-up", () => {
    const dir = join(root, "frontend", "src", "whatsNew");
    const md = readFileSync(join(dir, "whatsNew.md"), "utf8");
    const parts = (v: string) => v.split(".").map(Number);
    const notAfter = (a: string, b: string) => {
      const [x, y] = [parts(a), parts(b)];
      for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i];
      return true;
    };

    it("says which released version it was written for", () => {
      const v = /<!--\s*version:\s*([\d.]+)\s*-->/.exec(md)?.[1];
      expect(v, "start whatsNew.md with <!-- version: X.Y.Z -->").toMatch(/^\d+\.\d+\.\d+$/);
      expect(notAfter(v!, version), `${v} is after ${version}`).toBe(true);
      expect(() => readFileSync(join(root, "docs", "releases", `${v}.md`))).not.toThrow();
    });

    it("has every picture it shows", () => {
      for (const [, file] of md.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
        expect(existsSync(join(dir, file)), file).toBe(true);
      }
    });

    it("leaves server and admin steps to the release notes", () => {
      expect(md).not.toMatch(/docker|git pull|migration|server|backend|already in place/i);
    });
  });

  it("has release notes", () => {
    expect(() => readFileSync(join(root, "docs", "releases", `${version}.md`), "utf8")).not.toThrow();
  });
});
