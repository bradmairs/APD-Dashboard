import { prisma } from "./prisma";

// Formats a concise, bounded-size text summary of a project (or the whole
// portfolio) for an LLM prompt — not a dump of every row in every table.
// Each register contributes counts plus a short "top few" list of its most
// pressing open items, the same "what needs attention" framing the
// Dashboard's own panels use, so the assistant reasons from the same
// signals a PM already sees in the UI.

// A small local model (this talks to a self-hosted Ollama model — see
// ollama.ts) is unreliable at date arithmetic: asked "what needs
// attention," it has called a target date over a year away "overdue."
// Rather than hand it a bare ISO date and a system-prompt claim about
// "today" and trust it to subtract correctly, every date below is
// pre-annotated with the actual relative day count — the model only has
// to read that number, not compute it.
function fmtDate(d: Date | null | undefined, now: Date = new Date()): string {
  if (!d) return "—";
  const date = new Date(d);
  const iso = date.toISOString().substring(0, 10);
  const days = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return `${iso} (today)`;
  if (days > 0) return `${iso} (in ${days} day${days === 1 ? "" : "s"})`;
  const past = Math.abs(days);
  return `${iso} (${past} day${past === 1 ? "" : "s"} ago)`;
}

// Statuses where passing the target completion date is expected, not
// late — mirrors frontend/src/statusMeta.ts's STATUSES_EXEMPT_FROM_OVERDUE;
// duplicated rather than shared since the frontend module isn't reachable
// from the backend build.
const STATUSES_EXEMPT_FROM_OVERDUE = ["DEFECTS_LIABILITY", "COMPLETE", "CANCELLED"];

function fmtTargetCompletion(
  project: { targetCompletionDate: Date | null; status: string },
  now: Date = new Date()
): string {
  const base = fmtDate(project.targetCompletionDate, now);
  if (
    !project.targetCompletionDate ||
    STATUSES_EXEMPT_FROM_OVERDUE.includes(project.status) ||
    new Date(project.targetCompletionDate) >= now
  ) {
    return base;
  }
  return `${base} — OVERDUE`;
}

function fmtMoney(d: number | null | undefined): string {
  if (d === null || d === undefined) return "—";
  return `$${Number(d).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
}

export async function buildProjectContext(projectId: string): Promise<string | null> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;

  const [
    taskCounts,
    cashFlowEntries,
    openRisks,
    openActions,
    openDefects,
    openRfis,
    openSqe,
    openSafetyInspections,
    exceedanceReadings,
    expiringPermits,
    expiringInsurance,
    expiringTraining,
    lowPerformanceReviews,
    subcontractors,
  ] = await Promise.all([
    prisma.task.groupBy({ by: ["status"], where: { projectId }, _count: true }),
    prisma.cashFlowEntry.findMany({ where: { projectId } }),
    prisma.risk.findMany({
      where: { projectId, status: { not: "CLOSED" } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.actionItem.findMany({
      where: { projectId, status: { not: "DONE" } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.defectItem.findMany({
      where: { projectId, status: { not: "VERIFIED" } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.rfi.findMany({
      where: { projectId, status: "OPEN" },
      orderBy: { dateRequired: "asc" },
      take: 5,
    }),
    prisma.sqeRecord.findMany({
      where: { projectId, status: { not: "CLOSED" } },
      orderBy: { dateOccurred: "desc" },
      take: 5,
    }),
    prisma.safetyInspection.findMany({
      where: { projectId, status: { not: "CLOSED" } },
      orderBy: { score: "asc" },
      take: 5,
    }),
    prisma.environmentalMonitoringRecord.findMany({ where: { projectId } }),
    prisma.permit.findMany({ where: { projectId, expiryDate: { not: null } } }),
    prisma.insuranceWarranty.findMany({ where: { projectId, expiryDate: { not: null } } }),
    prisma.trainingRecord.findMany({ where: { projectId, expiryDate: { not: null } } }),
    prisma.performanceReview.findMany({ where: { projectId } }),
    prisma.subcontractor.findMany({ where: { projectId, status: { in: ["ENGAGED", "ACTIVE"] } } }),
  ]);

  const spendToDate = cashFlowEntries
    .filter((e) => e.type === "ACTUAL")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const now = new Date();
  const exceedances = exceedanceReadings.filter((r) =>
    r.limitValue !== null &&
    (r.limitType === "MAX" ? r.readingValue > r.limitValue : r.readingValue < r.limitValue)
  );
  const expiredPermits = expiringPermits.filter((p) => p.expiryDate! < now);
  const expiredInsurance = expiringInsurance.filter((i) => i.expiryDate! < now);
  const expiredTraining = expiringTraining.filter((t) => t.expiryDate! < now);
  const lowScoringReviews = lowPerformanceReviews.filter((r) => {
    const avg =
      (r.qualityRating + r.safetyRating + r.timelinessRating + r.communicationRating) / 4;
    return avg < 2.5;
  });

  const lines: string[] = [];
  lines.push(`Today's date: ${now.toISOString().substring(0, 10)}`);
  lines.push(`Project: ${project.name}`);
  lines.push(`Status: ${project.status}`);
  if (project.assetType) lines.push(`Asset type: ${project.assetType}`);
  if (project.location) lines.push(`Location: ${project.location}`);
  if (project.contractor) lines.push(`Contractor: ${project.contractor}`);
  if (project.description) lines.push(`Description: ${project.description}`);
  lines.push(`Start date: ${fmtDate(project.startDate, now)}`);
  lines.push(`Target completion: ${fmtTargetCompletion(project, now)}`);
  lines.push(`Actual completion: ${fmtDate(project.actualCompletionDate, now)}`);
  lines.push(`Original budget: ${fmtMoney(project.budget ? Number(project.budget) : null)}`);
  if (project.latestApprovedBudget) {
    lines.push(`Latest approved budget: ${fmtMoney(Number(project.latestApprovedBudget))}`);
  }
  lines.push(
    `Contract value: ${fmtMoney(project.contractValue ? Number(project.contractValue) : null)}`
  );
  lines.push(`Spend to date (actuals): ${fmtMoney(spendToDate)}`);
  lines.push("");

  lines.push("Tasks by status: " + taskCounts.map((t) => `${t.status}=${t._count}`).join(", ") || "none");
  lines.push(`Engaged subcontractors: ${subcontractors.length}`);
  lines.push("");

  function section(title: string, items: string[]) {
    lines.push(`${title} (${items.length}):`);
    if (items.length === 0) {
      lines.push("  none");
    } else {
      items.forEach((i) => lines.push(`  - ${i}`));
    }
    lines.push("");
  }

  section(
    "Open risks",
    openRisks.map((r) => `${r.title} (due ${fmtDate(r.dueDate, now)})`)
  );
  section(
    "Open actions/decisions",
    openActions.map((a) => `${a.title} (due ${fmtDate(a.dueDate, now)})`)
  );
  section(
    "Open defects",
    openDefects.map((d) => `${d.title} (due ${fmtDate(d.dueDate, now)})`)
  );
  section(
    "Open RFIs",
    openRfis.map((r) => `${r.subject} (required ${fmtDate(r.dateRequired, now)})`)
  );
  section(
    "Open safety/quality/environment issues",
    openSqe.map((s) => `[${s.category}/${s.severity}] ${s.title}`)
  );
  section(
    "Open safety inspections",
    openSafetyInspections.map(
      (s) => `${s.inspectionType}${s.score !== null ? ` (score ${s.score})` : ""}`
    )
  );
  section(
    "Environmental monitoring exceedances",
    exceedances.map((e) => `${e.parameter}: ${e.readingValue}${e.unit} (limit ${e.limitValue}${e.unit})`)
  );
  section(
    "Expired permits",
    expiredPermits.map((p) => `${p.title} (expired ${fmtDate(p.expiryDate, now)})`)
  );
  section(
    "Expired insurance/warranties",
    expiredInsurance.map((i) => `${i.title} (expired ${fmtDate(i.expiryDate, now)})`)
  );
  section(
    "Expired training/inductions",
    expiredTraining.map((t) => `${t.personName} — ${t.trainingType} (expired ${fmtDate(t.expiryDate, now)})`)
  );
  section(
    "Low-scoring performance reviews",
    lowScoringReviews.map((r) => `${r.revieweeName} (${fmtDate(r.reviewDate, now)})`)
  );

  return lines.join("\n");
}

export async function buildPortfolioContext(): Promise<string> {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
  });

  const [
    riskCounts,
    actionCounts,
    defectCounts,
    rfiCounts,
    sqeCounts,
    safetyInspections,
    cashFlowEntries,
  ] = await Promise.all([
    prisma.risk.groupBy({ by: ["projectId"], where: { status: { not: "CLOSED" } }, _count: true }),
    prisma.actionItem.groupBy({ by: ["projectId"], where: { status: { not: "DONE" } }, _count: true }),
    prisma.defectItem.groupBy({ by: ["projectId"], where: { status: { not: "VERIFIED" } }, _count: true }),
    prisma.rfi.groupBy({ by: ["projectId"], where: { status: "OPEN" }, _count: true }),
    prisma.sqeRecord.groupBy({ by: ["projectId"], where: { status: { not: "CLOSED" } }, _count: true }),
    prisma.safetyInspection.findMany({ where: { status: { not: "CLOSED" } } }),
    prisma.cashFlowEntry.findMany({ where: { type: "ACTUAL" } }),
  ]);

  const countByProject = (rows: { projectId: string; _count: number }[]) => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.projectId, r._count));
    return map;
  };

  const risksByProject = countByProject(riskCounts as any);
  const actionsByProject = countByProject(actionCounts as any);
  const defectsByProject = countByProject(defectCounts as any);
  const rfisByProject = countByProject(rfiCounts as any);
  const sqeByProject = countByProject(sqeCounts as any);
  const spendByProject = new Map<string, number>();
  cashFlowEntries.forEach((e) => {
    spendByProject.set(e.projectId, (spendByProject.get(e.projectId) ?? 0) + Number(e.amount));
  });
  const lowScoreInspectionsByProject = new Map<string, number>();
  safetyInspections
    .filter((s) => s.score !== null && s.score < 60)
    .forEach((s) => {
      lowScoreInspectionsByProject.set(
        s.projectId,
        (lowScoreInspectionsByProject.get(s.projectId) ?? 0) + 1
      );
    });

  const statusCounts = new Map<string, number>();
  projects.forEach((p) => statusCounts.set(p.status, (statusCounts.get(p.status) ?? 0) + 1));

  const totalBudget = projects.reduce((sum, p) => sum + (p.budget ? Number(p.budget) : 0), 0);
  const totalSpend = Array.from(spendByProject.values()).reduce((sum, v) => sum + v, 0);

  const now = new Date();
  const lines: string[] = [];
  lines.push(`Today's date: ${now.toISOString().substring(0, 10)}`);
  lines.push(`Portfolio: ${projects.length} projects`);
  lines.push(
    "By status: " + Array.from(statusCounts.entries()).map(([s, c]) => `${s}=${c}`).join(", ")
  );
  lines.push(`Total budget across portfolio: ${fmtMoney(totalBudget)}`);
  lines.push(`Total spend to date across portfolio: ${fmtMoney(totalSpend)}`);
  lines.push("");
  lines.push("Per-project summary:");
  projects.forEach((p) => {
    const flags: string[] = [];
    const risks = risksByProject.get(p.id) ?? 0;
    const actions = actionsByProject.get(p.id) ?? 0;
    const defects = defectsByProject.get(p.id) ?? 0;
    const rfis = rfisByProject.get(p.id) ?? 0;
    const sqe = sqeByProject.get(p.id) ?? 0;
    const lowInspections = lowScoreInspectionsByProject.get(p.id) ?? 0;
    if (risks) flags.push(`${risks} open risks`);
    if (actions) flags.push(`${actions} open actions`);
    if (defects) flags.push(`${defects} open defects`);
    if (rfis) flags.push(`${rfis} open RFIs`);
    if (sqe) flags.push(`${sqe} open SQE issues`);
    if (lowInspections) flags.push(`${lowInspections} low-scoring safety inspections`);
    const spend = spendByProject.get(p.id) ?? 0;
    lines.push(
      `- ${p.name} [${p.status}]: budget ${fmtMoney(p.budget ? Number(p.budget) : null)}, spend ${fmtMoney(spend)}, target completion ${fmtTargetCompletion(p, now)}${flags.length ? ` — ${flags.join(", ")}` : ""}`
    );
  });

  return lines.join("\n");
}
