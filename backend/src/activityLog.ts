import {
  ActionItem,
  ChecklistItem,
  CommunityEnquiry,
  ContractRecord,
  Correspondence,
  DefectItem,
  Delay,
  DocumentRecord,
  EnvironmentalMonitoringRecord,
  EotClaim,
  InsuranceWarranty,
  LessonLearned,
  MeetingMinutes,
  Milestone,
  PaymentClaim,
  Permit,
  Project,
  Rfi,
  Risk,
  SafetyInspection,
  SiteVisit,
  SqeRecord,
  Stakeholder,
  PerformanceReview,
  Subcontractor,
  Task,
  TenderPackage,
  ToolboxTalk,
  TrainingRecord,
  Variation,
} from "@prisma/client";
import { prisma } from "./prisma";

interface LogParams {
  projectId: string | null;
  projectName: string;
  userId: string | null;
  userName: string;
  action: string;
}

export function logActivity(params: LogParams) {
  return prisma.activityLog.create({ data: params });
}

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planning",
  DESIGN: "Design",
  TENDER: "Tender",
  CONSTRUCTION: "Construction",
  DEFECTS_LIABILITY: "Defects Liability",
  COMPLETE: "Complete",
  ON_HOLD: "On Hold",
  CANCELLED: "Cancelled",
};

const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

const PROJECT_FIELD_LABELS: Record<string, string> = {
  name: "name",
  description: "description",
  assetType: "asset type",
  projectNumber: "project number",
  bpRefNo: "BP ref. no.",
  projectManager: "project manager",
  location: "location",
  contractor: "contractor",
  budget: "original budget",
  latestApprovedBudget: "latest approved budget",
  contractValue: "contract value",
  startDate: "start date",
  targetCompletionDate: "target completion date",
  actualCompletionDate: "actual completion date",
};

const NUMERIC_FIELDS = new Set(["budget", "latestApprovedBudget", "contractValue"]);
const DATE_FIELDS = new Set([
  "startDate",
  "targetCompletionDate",
  "actualCompletionDate",
  "dueDate",
]);

function valuesEqual(field: string, before: unknown, submitted: unknown): boolean {
  if (NUMERIC_FIELDS.has(field)) {
    const b = before === null || before === undefined ? null : Number(before);
    const a =
      submitted === null || submitted === undefined || submitted === ""
        ? null
        : Number(submitted);
    return b === a;
  }
  if (DATE_FIELDS.has(field)) {
    const b = before ? new Date(before as string).getTime() : null;
    const a = submitted ? new Date(submitted as string).getTime() : null;
    return b === a;
  }
  const b = before ?? null;
  const a = submitted === "" ? null : submitted ?? null;
  return b === a;
}

// Compares the pre-update record against the raw request body (not the
// post-update record) so we only need one query, and describes what
// actually changed in one human-readable line.
export function describeProjectChanges(
  before: Project,
  body: Record<string, unknown>
): string {
  const changedLabels: string[] = [];
  let statusChange: string | null = null;

  for (const [field, label] of Object.entries(PROJECT_FIELD_LABELS)) {
    if (!(field in body)) continue;
    if (!valuesEqual(field, (before as Record<string, unknown>)[field], body[field])) {
      changedLabels.push(label);
    }
  }

  if ("status" in body && body.status !== before.status) {
    const from = STATUS_LABELS[before.status] ?? before.status;
    const to = STATUS_LABELS[body.status as string] ?? String(body.status);
    statusChange = `changed status from ${from} to ${to}`;
  }

  const parts: string[] = [];
  if (statusChange) parts.push(statusChange);
  if (changedLabels.length > 0) parts.push(`updated ${changedLabels.join(", ")}`);

  return parts.length > 0 ? parts.join("; ") : "updated project details";
}

export function describeTaskUpdate(before: Task, body: Record<string, unknown>): string {
  if ("status" in body && body.status !== before.status) {
    const label = TASK_STATUS_LABELS[body.status as string] ?? String(body.status);
    return `marked task "${before.title}" as ${label}`;
  }
  if ("dueDate" in body && !valuesEqual("dueDate", before.dueDate, body.dueDate)) {
    return `updated the due date for task "${before.title}"`;
  }
  return `updated task "${before.title}"`;
}

export function describeMilestoneUpdate(
  before: Milestone,
  body: Record<string, unknown>
): string {
  if ("percentComplete" in body && body.percentComplete !== before.percentComplete) {
    return `updated milestone "${before.taskActivity}" to ${body.percentComplete}% complete`;
  }
  return `updated milestone "${before.taskActivity}"`;
}

export function describeSiteVisitUpdate(
  before: SiteVisit,
  body: Record<string, unknown>
): string {
  if ("location" in body && body.location !== before.location) {
    return `updated the site visit location to "${body.location}"`;
  }
  return `updated the site visit at ${before.location}`;
}

const VARIATION_STATUS_LABELS: Record<string, string> = {
  PROPOSED: "Proposed",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function describeVariationUpdate(
  before: Variation,
  body: Record<string, unknown>
): string {
  if ("status" in body && body.status !== before.status) {
    const label = VARIATION_STATUS_LABELS[body.status as string] ?? String(body.status);
    return `marked variation "${before.title}" as ${label}`;
  }
  return `updated variation "${before.title}"`;
}

const RISK_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  MITIGATING: "Mitigating",
  CLOSED: "Closed",
};

export function describeRiskUpdate(before: Risk, body: Record<string, unknown>): string {
  const noun = before.type === "OPPORTUNITY" ? "opportunity" : "risk";
  if ("status" in body && body.status !== before.status) {
    const label = RISK_STATUS_LABELS[body.status as string] ?? String(body.status);
    return `marked ${noun} "${before.title}" as ${label}`;
  }
  if (
    ("residualLikelihood" in body || "residualConsequence" in body) &&
    (body.residualLikelihood !== before.residualLikelihood ||
      body.residualConsequence !== before.residualConsequence)
  ) {
    return `updated the residual rating for ${noun} "${before.title}"`;
  }
  return `updated ${noun} "${before.title}"`;
}

const ACTION_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

export function describeActionItemUpdate(
  before: ActionItem,
  body: Record<string, unknown>
): string {
  const noun = before.type === "DECISION" ? "decision" : "action";
  if ("status" in body && body.status !== before.status) {
    const label = ACTION_STATUS_LABELS[body.status as string] ?? String(body.status);
    return `marked ${noun} "${before.title}" as ${label}`;
  }
  return `updated ${noun} "${before.title}"`;
}

export function describeStakeholderUpdate(
  before: Stakeholder,
  body: Record<string, unknown>
): string {
  return `updated stakeholder "${before.name}"`;
}

const PERMIT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function describePermitUpdate(
  before: Permit,
  body: Record<string, unknown>
): string {
  if ("status" in body && body.status !== before.status) {
    const label = PERMIT_STATUS_LABELS[body.status as string] ?? String(body.status);
    return `marked permit "${before.title}" as ${label}`;
  }
  return `updated permit "${before.title}"`;
}

export function describeLessonLearnedUpdate(
  before: LessonLearned,
  body: Record<string, unknown>
): string {
  return `updated lesson learned "${before.title}"`;
}

const SQE_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  CLOSED: "Closed",
};

export function describeSqeUpdate(
  before: SqeRecord,
  body: Record<string, unknown>
): string {
  const noun = `${before.category.toLowerCase()} issue`;
  if ("status" in body && body.status !== before.status) {
    const label = SQE_STATUS_LABELS[body.status as string] ?? String(body.status);
    return `marked ${noun} "${before.title}" as ${label}`;
  }
  return `updated ${noun} "${before.title}"`;
}

const EOT_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function describeEotClaimUpdate(
  before: EotClaim,
  body: Record<string, unknown>
): string {
  if ("status" in body && body.status !== before.status) {
    const label = EOT_STATUS_LABELS[body.status as string] ?? String(body.status);
    const grantedNote =
      body.status === "APPROVED" && body.daysGranted !== undefined
        ? ` (${body.daysGranted} days granted)`
        : "";
    return `marked EOT claim "${before.title}" as ${label}${grantedNote}`;
  }
  return `updated EOT claim "${before.title}"`;
}

export function describeDelayUpdate(
  before: Delay,
  body: Record<string, unknown>
): string {
  if ("status" in body && body.status !== before.status) {
    const label = body.status === "RESOLVED" ? "resolved" : "reopened";
    return `${label} delay "${before.title}"`;
  }
  return `updated delay "${before.title}"`;
}

const CHECKLIST_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETE: "Complete",
  NOT_APPLICABLE: "Not Applicable",
};

export function describeChecklistItemUpdate(
  before: ChecklistItem,
  body: Record<string, unknown>
): string {
  const noun = before.phase === "HANDOVER" ? "handover item" : "commissioning item";
  if ("status" in body && body.status !== before.status) {
    const label = CHECKLIST_STATUS_LABELS[body.status as string] ?? String(body.status);
    return `marked ${noun} "${before.title}" as ${label}`;
  }
  return `updated ${noun} "${before.title}"`;
}

const DEFECT_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  RECTIFIED: "Rectified",
  VERIFIED: "Verified",
  DISPUTED: "Disputed",
};

export function describeDefectUpdate(
  before: DefectItem,
  body: Record<string, unknown>
): string {
  if ("status" in body && body.status !== before.status) {
    const label = DEFECT_STATUS_LABELS[body.status as string] ?? String(body.status);
    return `marked defect "${before.title}" as ${label}`;
  }
  return `updated defect "${before.title}"`;
}

const PAYMENT_CLAIM_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  CERTIFIED: "Certified",
  DISPUTED: "Disputed",
  PAID: "Paid",
};

export function describePaymentClaimUpdate(
  before: PaymentClaim,
  body: Record<string, unknown>
): string {
  if ("status" in body && body.status !== before.status) {
    const label = PAYMENT_CLAIM_STATUS_LABELS[body.status as string] ?? String(body.status);
    const certifiedNote =
      body.status === "CERTIFIED" && body.certifiedAmount !== undefined
        ? ` ($${body.certifiedAmount} certified)`
        : "";
    return `marked payment claim "${before.claimNumber}" as ${label}${certifiedNote}`;
  }
  return `updated payment claim "${before.claimNumber}"`;
}

export function describeInsuranceWarrantyUpdate(
  before: InsuranceWarranty,
  body: Record<string, unknown>
): string {
  const noun = before.type === "WARRANTY" ? "warranty" : "insurance policy";
  return `updated ${noun} "${before.title}"`;
}

const RFI_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  ANSWERED: "Answered",
  CLOSED: "Closed",
};

export function describeRfiUpdate(before: Rfi, body: Record<string, unknown>): string {
  if ("status" in body && body.status !== before.status) {
    const label = RFI_STATUS_LABELS[body.status as string] ?? String(body.status);
    return `marked RFI "${before.rfiNumber}" as ${label}`;
  }
  return `updated RFI "${before.rfiNumber}"`;
}

const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  FOR_REVIEW: "For Review",
  APPROVED: "Approved",
  SUPERSEDED: "Superseded",
};

export function describeDocumentUpdate(
  before: DocumentRecord,
  body: Record<string, unknown>
): string {
  if ("status" in body && body.status !== before.status) {
    const label = DOCUMENT_STATUS_LABELS[body.status as string] ?? String(body.status);
    return `marked document "${before.documentNumber}: ${before.title}" as ${label}`;
  }
  return `updated document "${before.documentNumber}: ${before.title}"`;
}

const ENQUIRY_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export function describeCommunityEnquiryUpdate(
  before: CommunityEnquiry,
  body: Record<string, unknown>
): string {
  const label = before.reference ? `"${before.reference}"` : `#${before.id.slice(-6)}`;
  if ("status" in body && body.status !== before.status) {
    const statusLabel = ENQUIRY_STATUS_LABELS[body.status as string] ?? String(body.status);
    return `marked community enquiry ${label} as ${statusLabel}`;
  }
  return `updated community enquiry ${label}`;
}

const SUBCONTRACTOR_STATUS_LABELS: Record<string, string> = {
  ENGAGED: "Engaged",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  TERMINATED: "Terminated",
};

export function describeSubcontractorUpdate(
  before: Subcontractor,
  body: Record<string, unknown>
): string {
  if ("status" in body && body.status !== before.status) {
    const label = SUBCONTRACTOR_STATUS_LABELS[body.status as string] ?? String(body.status);
    return `marked subcontractor "${before.companyName}" as ${label}`;
  }
  return `updated subcontractor "${before.companyName}"`;
}

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  COMPLETE: "Complete",
  TERMINATED: "Terminated",
};

export function describeContractUpdate(
  before: ContractRecord,
  body: Record<string, unknown>
): string {
  const noun = before.partyType === "CONSULTANT" ? "consultant contract" : "contractor contract";
  if ("status" in body && body.status !== before.status) {
    const label = CONTRACT_STATUS_LABELS[body.status as string] ?? String(body.status);
    return `marked ${noun} "${before.partyName}" as ${label}`;
  }
  return `updated ${noun} "${before.partyName}"`;
}

export function describeMeetingMinutesUpdate(before: MeetingMinutes): string {
  if (before.title) return `updated meeting minutes "${before.title}"`;
  return before.meetingType
    ? `updated meeting minutes for a ${before.meetingType}`
    : "updated meeting minutes";
}

export function describeCorrespondenceUpdate(
  before: Correspondence,
  body: Record<string, unknown>
): string {
  if ("status" in body && body.status !== before.status) {
    const label = body.status === "CLOSED" ? "Closed" : "Open";
    return `marked correspondence "${before.subject}" as ${label}`;
  }
  return `updated correspondence "${before.subject}"`;
}

export function describeTrainingRecordUpdate(before: TrainingRecord): string {
  return `updated training record "${before.trainingType}" for ${before.personName}`;
}

export function describePerformanceReviewUpdate(before: PerformanceReview): string {
  return `updated the performance review for "${before.revieweeName}"`;
}

export function describeToolboxTalkUpdate(before: ToolboxTalk): string {
  return `updated the toolbox talk on "${before.topic}"`;
}

export function describeEnvironmentalMonitoringUpdate(
  before: EnvironmentalMonitoringRecord
): string {
  return `updated the environmental monitoring reading for "${before.parameter}"`;
}

const SAFETY_INSPECTION_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  CLOSED: "Closed",
};

export function describeSafetyInspectionUpdate(
  before: SafetyInspection,
  body: Record<string, unknown>
): string {
  if ("status" in body && body.status !== before.status) {
    const label =
      SAFETY_INSPECTION_STATUS_LABELS[body.status as string] ?? String(body.status);
    return `marked the safety inspection "${before.inspectionType}" as ${label}`;
  }
  return `updated the safety inspection "${before.inspectionType}"`;
}

const TENDER_STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planned",
  ISSUED: "Issued",
  EVALUATION: "Evaluation",
  AWARDED: "Awarded",
  CANCELLED: "Cancelled",
};

export function describeTenderPackageUpdate(
  before: TenderPackage,
  body: Record<string, unknown>
): string {
  if ("status" in body && body.status !== before.status) {
    const label = TENDER_STATUS_LABELS[body.status as string] ?? String(body.status);
    const awardNote =
      body.status === "AWARDED" && body.awardedTo ? ` to "${body.awardedTo}"` : "";
    return `marked tender package "${before.title}" as ${label}${awardNote}`;
  }
  return `updated tender package "${before.title}"`;
}
