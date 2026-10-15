import { MonthlyReport, Project, User } from "./types";

// Mirrors backend/src/permissions.ts. A project with no recorded owner
// (created before this feature, or its creator's account was removed) is
// editable by anyone.
export function canModifyProject(project: Project, user: User | null): boolean {
  if (!user || user.role === "VIEWER") return false;
  return (
    !project.createdById || project.createdById === user.id || user.role === "ADMIN"
  );
}

export function canModifyReport(report: MonthlyReport, user: User | null): boolean {
  if (!user || user.role === "VIEWER") return false;
  return (
    !report.createdById || report.createdById === user.id || user.role === "ADMIN"
  );
}
