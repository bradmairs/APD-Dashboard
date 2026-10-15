import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeProjectHealth } from "./health";
import type { Project, Risk } from "./types";

const project = (over: Partial<Project>) =>
  ({ status: "CONSTRUCTION", budget: null, latestApprovedBudget: null, startDate: null, targetCompletionDate: null, ...over }) as unknown as Project;

describe("computeProjectHealth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T00:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("is green when there is no schedule, budget or risk data", () => {
    expect(computeProjectHealth(project({}), [], [], []).overall).toBe("GREEN");
  });

  it("schedule goes amber at 95% of the timeframe and red beyond 115%", () => {
    const start = "2026-01-01T00:00:00Z";
    // 165 days elapsed by 15 Jun; planned duration controls the percentage.
    const amber = project({ startDate: start, targetCompletionDate: "2026-06-25T00:00:00Z" }); // ~165/175 = 94% -> green
    const amberEdge = project({ startDate: start, targetCompletionDate: "2026-06-15T00:00:00Z" }); // 100% -> amber
    const red = project({ startDate: start, targetCompletionDate: "2026-05-01T00:00:00Z" }); // 165/120 = 137% -> red
    expect(computeProjectHealth(amber, [], [], []).schedule).toBe("GREEN");
    expect(computeProjectHealth(amberEdge, [], [], []).schedule).toBe("AMBER");
    expect(computeProjectHealth(red, [], [], []).schedule).toBe("RED");
  });

  it("does not track completed projects against the target date", () => {
    const done = project({ status: "COMPLETE", startDate: "2026-01-01T00:00:00Z", targetCompletionDate: "2026-02-01T00:00:00Z" });
    expect(computeProjectHealth(done, [], [], []).schedule).toBe("GREEN");
  });

  it("overall health is the worst of the dimensions", () => {
    const red = project({ startDate: "2026-01-01T00:00:00Z", targetCompletionDate: "2026-05-01T00:00:00Z" });
    expect(computeProjectHealth(red, [], [], [] as Risk[]).overall).toBe("RED");
  });
});
