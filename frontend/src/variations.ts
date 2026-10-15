import { Project, Variation } from "./types";

// Only an APPROVED variation counts toward the budget — a Proposed one
// hasn't been agreed yet, and a Rejected one never happened.
export function approvedVariationsTotal(variations: Variation[]): number {
  return variations
    .filter((v) => v.status === "APPROVED")
    .reduce((sum, v) => sum + Number(v.costImpact), 0);
}

// A project's budget as revised by its approved variations. Null when the
// project has no budget set at all — there's nothing to revise.
export function revisedBudget(
  project: Pick<Project, "budget">,
  variations: Variation[]
): number | null {
  if (project.budget === null) return null;
  return Number(project.budget) + approvedVariationsTotal(variations);
}

// The budget to measure actuals against: the manually-tracked Latest
// Approved Budget when a PM has entered one, since it already reflects
// every negotiated change (not all of which get raised as a Variation),
// falling back to the Original Budget as revised by approved Variations
// otherwise.
export function effectiveBudget(
  project: Pick<Project, "budget" | "latestApprovedBudget">,
  variations: Variation[]
): number | null {
  if (project.latestApprovedBudget !== null) return Number(project.latestApprovedBudget);
  return revisedBudget(project, variations);
}
