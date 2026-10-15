import { EotClaim, Project } from "./types";

// Only an APPROVED claim's granted days count — a Submitted claim hasn't
// been decided yet, and a Rejected one never happened. Falls back to
// daysClaimed only if a claim was marked Approved without daysGranted
// ever being recorded (shouldn't happen via the UI, but keeps the total
// honest rather than silently dropping an approved claim to zero).
export function approvedEotDaysTotal(claims: EotClaim[]): number {
  return claims
    .filter((c) => c.status === "APPROVED")
    .reduce((sum, c) => sum + (c.daysGranted ?? c.daysClaimed), 0);
}

// A project's expected completion date as revised by its approved EOT
// claims — the schedule equivalent of variations.ts's revisedBudget.
// Null when the project has no target completion date at all — there's
// nothing to revise.
export function revisedCompletionDate(
  project: Pick<Project, "targetCompletionDate">,
  claims: EotClaim[]
): string | null {
  if (!project.targetCompletionDate) return null;
  const extraDays = approvedEotDaysTotal(claims);
  if (extraDays === 0) return project.targetCompletionDate;
  const revised = new Date(project.targetCompletionDate);
  revised.setDate(revised.getDate() + extraDays);
  return revised.toISOString();
}
