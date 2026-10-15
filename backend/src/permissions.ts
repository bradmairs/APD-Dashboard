import { MonthlyReport, Project } from "@prisma/client";
import { AuthTokenPayload } from "./auth";

// A project with no recorded owner (created before this feature, or its
// creator's account has since been removed) is editable by anyone — an
// unowned record can't meaningfully enforce ownership, and locking it to
// admins-only would strand pre-existing/seeded projects.
export function canModifyProject(
  project: Pick<Project, "createdById">,
  user: AuthTokenPayload
): boolean {
  return (
    !project.createdById || project.createdById === user.sub || user.role === "ADMIN"
  );
}

export function canModifyReport(
  report: Pick<MonthlyReport, "createdById">,
  user: AuthTokenPayload
): boolean {
  return (
    !report.createdById || report.createdById === user.sub || user.role === "ADMIN"
  );
}
