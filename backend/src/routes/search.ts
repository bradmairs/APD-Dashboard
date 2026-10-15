import { Request, Response, Router } from "express";
import { prisma } from "../prisma";
import { rankResults } from "../searchRank";

export const searchRouter = Router();

const RESULTS_PER_TYPE = 5;
// Fetch more candidates than we return so ranking can promote a close match
// that is older than five weaker ones.
const CANDIDATES_PER_TYPE = 25;

interface SearchResult {
  type: string;
  typeLabel: string;
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  subtitle: string | null;
  date: Date | null;
}

// Cross-register keyword search covering every project-scoped register in
// the app (plus Projects themselves) — not a single full-text index, but one
// capped, parallel `contains` query per register, so a user can find
// anything by number, name, or title (an RFI number, a contractor's name, a
// toolbox talk topic) from one box regardless of which tab it lives on.
// Candidates are scored by how closely they match (see searchRank.ts) and
// each register keeps its best few, with the registers holding the closest
// hits listed first.
searchRouter.get("/", async (req: Request, res: Response) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) {
    return res.json({ query: q, results: [] });
  }

  const contains = { contains: q, mode: "insensitive" as const };
  const projectSelect = { select: { id: true, name: true } } as const;

  const [
    projects,
    risks,
    actions,
    rfis,
    defects,
    variations,
    documents,
    correspondence,
    subcontractors,
    tenderPackages,
    tasks,
    milestones,
    eotClaims,
    delays,
    checklistItems,
    contracts,
    paymentClaims,
    insuranceWarranties,
    permits,
    performanceReviews,
    stakeholders,
    meetingMinutes,
    siteVisits,
    enquiries,
    archiveLinks,
    lessonsLearned,
    trainingRecords,
    toolboxTalks,
    environmentalRecords,
    safetyInspections,
    sqeRecords,
  ] = await Promise.all([
    prisma.project.findMany({
      where: {
        OR: [
          { name: contains },
          { description: contains },
          { location: contains },
          { contractor: contains },
          { bpRefNo: contains },
        ],
      },
      take: CANDIDATES_PER_TYPE,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.risk.findMany({
      where: { OR: [{ title: contains }, { description: contains }] },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.actionItem.findMany({
      where: { OR: [{ title: contains }, { description: contains }] },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.rfi.findMany({
      where: { OR: [{ rfiNumber: contains }, { subject: contains }, { question: contains }] },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.defectItem.findMany({
      where: { OR: [{ title: contains }, { description: contains }, { location: contains }] },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.variation.findMany({
      where: { OR: [{ title: contains }, { description: contains }, { reference: contains }] },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.documentRecord.findMany({
      where: { OR: [{ documentNumber: contains }, { title: contains }, { description: contains }] },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.correspondence.findMany({
      where: { OR: [{ subject: contains }, { summary: contains }, { correspondent: contains }] },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.subcontractor.findMany({
      where: { OR: [{ companyName: contains }, { trade: contains }] },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.tenderPackage.findMany({
      where: { OR: [{ title: contains }, { packageNumber: contains }, { description: contains }] },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    // Portfolio-wide tasks (projectId null) have no project to link to, so
    // they're excluded here rather than shown as an unopenable result.
    prisma.task.findMany({
      where: {
        projectId: { not: null },
        OR: [{ title: contains }, { description: contains }],
      },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.milestone.findMany({
      where: { OR: [{ taskActivity: contains }, { wbsItem: contains }, { notes: contains }] },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.eotClaim.findMany({
      where: {
        OR: [{ title: contains }, { reference: contains }, { cause: contains }, { description: contains }],
      },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.delay.findMany({
      where: {
        OR: [
          { title: contains },
          { category: contains },
          { description: contains },
          { responsibleParty: contains },
          { eotReference: contains },
        ],
      },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.checklistItem.findMany({
      where: { OR: [{ title: contains }, { description: contains }, { responsible: contains }] },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.contractRecord.findMany({
      where: { OR: [{ partyName: contains }, { contractNumber: contains }, { discipline: contains }] },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.paymentClaim.findMany({
      where: { OR: [{ claimNumber: contains }, { notes: contains }] },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.insuranceWarranty.findMany({
      where: {
        OR: [
          { title: contains },
          { provider: contains },
          { referenceNumber: contains },
          { coverageDetails: contains },
        ],
      },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.permit.findMany({
      where: {
        OR: [{ title: contains }, { referenceNumber: contains }, { issuingAuthority: contains }],
      },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.performanceReview.findMany({
      where: { OR: [{ revieweeName: contains }, { reviewPeriod: contains }, { comments: contains }] },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.stakeholder.findMany({
      where: { OR: [{ name: contains }, { organization: contains }, { role: contains }] },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.meetingMinutes.findMany({
      where: {
        OR: [
          { title: contains },
          { meetingType: contains },
          { summary: contains },
          { notes: contains },
          { attendees: contains },
        ],
      },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.siteVisit.findMany({
      where: { OR: [{ location: contains }, { notes: contains }, { discussionNotes: contains }] },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.communityEnquiry.findMany({
      where: {
        OR: [
          { description: contains },
          { contactName: contains },
          { reference: contains },
          { source: contains },
        ],
      },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.archiveLink.findMany({
      where: { OR: [{ label: contains }] },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.lessonLearned.findMany({
      where: { OR: [{ title: contains }, { description: contains }, { recommendation: contains }] },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.trainingRecord.findMany({
      where: {
        OR: [
          { personName: contains },
          { trainingType: contains },
          { company: contains },
          { certificateNumber: contains },
        ],
      },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.toolboxTalk.findMany({
      where: { OR: [{ topic: contains }, { conductedBy: contains }, { keyPoints: contains }] },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.environmentalMonitoringRecord.findMany({
      where: { OR: [{ parameter: contains }, { location: contains }, { correctiveAction: contains }] },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.safetyInspection.findMany({
      where: {
        OR: [
          { inspectionType: contains },
          { location: contains },
          { findings: contains },
          { conductedBy: contains },
        ],
      },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.sqeRecord.findMany({
      where: { OR: [{ title: contains }, { description: contains }, { correctiveAction: contains }] },
      include: { project: projectSelect },
      take: CANDIDATES_PER_TYPE,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const results: SearchResult[] = [
    ...projects.map((p) => ({
      type: "project",
      typeLabel: "Project",
      id: p.id,
      projectId: p.id,
      projectName: p.name,
      title: p.name,
      subtitle: p.location,
      date: p.createdAt,
    })),
    ...risks.map((r) => ({
      type: "risk",
      typeLabel: r.type === "OPPORTUNITY" ? "Opportunity" : "Risk",
      id: r.id,
      projectId: r.project.id,
      projectName: r.project.name,
      title: r.title,
      subtitle: r.category,
      date: r.createdAt,
    })),
    ...actions.map((a) => ({
      type: "action",
      typeLabel: a.type === "DECISION" ? "Decision" : "Action",
      id: a.id,
      projectId: a.project.id,
      projectName: a.project.name,
      title: a.title,
      subtitle: a.ownerName,
      date: a.createdAt,
    })),
    ...rfis.map((r) => ({
      type: "rfi",
      typeLabel: "RFI",
      id: r.id,
      projectId: r.project.id,
      projectName: r.project.name,
      title: `${r.rfiNumber}: ${r.subject}`,
      subtitle: null,
      date: r.createdAt,
    })),
    ...defects.map((d) => ({
      type: "defect",
      typeLabel: "Defect",
      id: d.id,
      projectId: d.project.id,
      projectName: d.project.name,
      title: d.title,
      subtitle: d.location,
      date: d.createdAt,
    })),
    ...variations.map((v) => ({
      type: "variation",
      typeLabel: "Variation",
      id: v.id,
      projectId: v.project.id,
      projectName: v.project.name,
      title: v.title,
      subtitle: v.reference,
      date: v.createdAt,
    })),
    ...documents.map((d) => ({
      type: "document",
      typeLabel: "Document",
      id: d.id,
      projectId: d.project.id,
      projectName: d.project.name,
      title: `${d.documentNumber}: ${d.title}`,
      subtitle: null,
      date: d.createdAt,
    })),
    ...correspondence.map((c) => ({
      type: "correspondence",
      typeLabel: "Correspondence",
      id: c.id,
      projectId: c.project.id,
      projectName: c.project.name,
      title: c.subject,
      subtitle: c.correspondent,
      date: c.createdAt,
    })),
    ...subcontractors.map((s) => ({
      type: "subcontractor",
      typeLabel: "Subcontractor",
      id: s.id,
      projectId: s.project.id,
      projectName: s.project.name,
      title: s.companyName,
      subtitle: s.trade,
      date: s.createdAt,
    })),
    ...tenderPackages.map((t) => ({
      type: "tender",
      typeLabel: "Tender Package",
      id: t.id,
      projectId: t.project.id,
      projectName: t.project.name,
      title: t.title,
      subtitle: t.packageNumber,
      date: t.createdAt,
    })),
    ...tasks
      .filter((t) => t.project !== null)
      .map((t) => ({
        type: "task",
        typeLabel: "Task",
        id: t.id,
        projectId: t.project!.id,
        projectName: t.project!.name,
        title: t.title,
        subtitle: t.description,
        date: t.createdAt,
      })),
    ...milestones.map((m) => ({
      type: "milestone",
      typeLabel: "Milestone",
      id: m.id,
      projectId: m.project.id,
      projectName: m.project.name,
      title: m.taskActivity,
      subtitle: m.wbsItem,
      date: m.createdAt,
    })),
    ...eotClaims.map((e) => ({
      type: "eot",
      typeLabel: "EOT Claim",
      id: e.id,
      projectId: e.project.id,
      projectName: e.project.name,
      title: e.title,
      subtitle: e.reference,
      date: e.createdAt,
    })),
    ...delays.map((d) => ({
      type: "delay",
      typeLabel: "Delay",
      id: d.id,
      projectId: d.project.id,
      projectName: d.project.name,
      title: d.title,
      subtitle: d.category,
      date: d.createdAt,
    })),
    ...checklistItems.map((c) => ({
      type: "checklist",
      typeLabel: "Checklist Item",
      id: c.id,
      projectId: c.project.id,
      projectName: c.project.name,
      title: c.title,
      subtitle: c.responsible,
      date: c.createdAt,
    })),
    ...contracts.map((c) => ({
      type: "contract",
      typeLabel: "Contract",
      id: c.id,
      projectId: c.project.id,
      projectName: c.project.name,
      title: c.partyName,
      subtitle: c.contractNumber,
      date: c.createdAt,
    })),
    ...paymentClaims.map((p) => ({
      type: "paymentClaim",
      typeLabel: "Payment Claim",
      id: p.id,
      projectId: p.project.id,
      projectName: p.project.name,
      title: p.claimNumber,
      subtitle: null,
      date: p.createdAt,
    })),
    ...insuranceWarranties.map((i) => ({
      type: "insurance",
      typeLabel: "Insurance/Warranty",
      id: i.id,
      projectId: i.project.id,
      projectName: i.project.name,
      title: i.title,
      subtitle: i.provider,
      date: i.createdAt,
    })),
    ...permits.map((p) => ({
      type: "permit",
      typeLabel: "Permit",
      id: p.id,
      projectId: p.project.id,
      projectName: p.project.name,
      title: p.title,
      subtitle: p.referenceNumber,
      date: p.createdAt,
    })),
    ...performanceReviews.map((p) => ({
      type: "performanceReview",
      typeLabel: "Performance Review",
      id: p.id,
      projectId: p.project.id,
      projectName: p.project.name,
      title: p.revieweeName,
      subtitle: p.reviewPeriod,
      date: p.createdAt,
    })),
    ...stakeholders.map((s) => ({
      type: "stakeholder",
      typeLabel: "Stakeholder",
      id: s.id,
      projectId: s.project.id,
      projectName: s.project.name,
      title: s.name,
      subtitle: s.organization,
      date: s.createdAt,
    })),
    ...meetingMinutes.map((m) => ({
      type: "meetingMinutes",
      typeLabel: "Meeting Minutes",
      id: m.id,
      projectId: m.project.id,
      projectName: m.project.name,
      title: m.title || m.meetingType || "Meeting",
      subtitle: m.meetingType,
      date: m.createdAt,
    })),
    ...siteVisits.map((s) => ({
      type: "siteVisit",
      typeLabel: "Site Visit",
      id: s.id,
      projectId: s.project.id,
      projectName: s.project.name,
      title: s.location,
      subtitle: null,
      date: s.createdAt,
    })),
    ...enquiries.map((e) => ({
      type: "enquiry",
      typeLabel: "Community Enquiry",
      id: e.id,
      projectId: e.project.id,
      projectName: e.project.name,
      title: e.description,
      subtitle: e.contactName,
      date: e.createdAt,
    })),
    ...archiveLinks.map((a) => ({
      type: "archiveLink",
      typeLabel: "Archive Link",
      id: a.id,
      projectId: a.project.id,
      projectName: a.project.name,
      title: a.label,
      subtitle: null,
      date: a.createdAt,
    })),
    ...lessonsLearned.map((l) => ({
      type: "lessonLearned",
      typeLabel: "Lesson Learned",
      id: l.id,
      projectId: l.project.id,
      projectName: l.project.name,
      title: l.title,
      subtitle: l.category,
      date: l.createdAt,
    })),
    ...trainingRecords.map((t) => ({
      type: "trainingRecord",
      typeLabel: "Training Record",
      id: t.id,
      projectId: t.project.id,
      projectName: t.project.name,
      title: t.personName,
      subtitle: t.trainingType,
      date: t.createdAt,
    })),
    ...toolboxTalks.map((t) => ({
      type: "toolboxTalk",
      typeLabel: "Toolbox Talk",
      id: t.id,
      projectId: t.project.id,
      projectName: t.project.name,
      title: t.topic,
      subtitle: t.conductedBy,
      date: t.createdAt,
    })),
    ...environmentalRecords.map((e) => ({
      type: "environmentalMonitoring",
      typeLabel: "Environmental Monitoring",
      id: e.id,
      projectId: e.project.id,
      projectName: e.project.name,
      title: e.parameter,
      subtitle: e.location,
      date: e.createdAt,
    })),
    ...safetyInspections.map((s) => ({
      type: "safetyInspection",
      typeLabel: "Safety Inspection",
      id: s.id,
      projectId: s.project.id,
      projectName: s.project.name,
      title: s.inspectionType,
      subtitle: s.location,
      date: s.createdAt,
    })),
    ...sqeRecords.map((s) => ({
      type: "sqe",
      typeLabel: "SQE Issue",
      id: s.id,
      projectId: s.project.id,
      projectName: s.project.name,
      title: s.title,
      subtitle: null,
      date: s.createdAt,
    })),
  ];

  res.json({ query: q, results: rankResults(results, q, RESULTS_PER_TYPE) });
});
