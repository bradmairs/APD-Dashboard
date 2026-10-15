export type Role = "ADMIN" | "MEMBER" | "VIEWER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
  // Only populated on the logged-in user's own record (login/me responses) —
  // see PUT /api/auth/preferences. Not selected on the admin Users list.
  emailDigestOptIn?: boolean;
  // Own record (login/me) and the admin Users list — see backend/src/twoFactor.ts.
  twoFactorEnabled?: boolean;
}

export type ProjectStatus =
  | "PLANNING"
  | "DESIGN"
  | "TENDER"
  | "CONSTRUCTION"
  | "PROJECT_COMPLETION"
  | "DEFECTS_LIABILITY"
  | "COMPLETE"
  | "ON_HOLD"
  | "CANCELLED";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskRecurrence = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";

export interface Task {
  id: string;
  // Null for a portfolio-wide task — relevant to every project rather than
  // scoped to one (e.g. "Complete monthly reports").
  projectId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: string | null;
  recurrence: TaskRecurrence;
  meetingMinutesId: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
}

export interface TaskTemplateItem {
  id: string;
  templateId: string;
  title: string;
  description: string | null;
  dueOffsetDays: number | null;
  sortOrder: number;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  items: TaskTemplateItem[];
}

export interface TaskTemplateItemInput {
  title: string;
  description?: string | null;
  dueOffsetDays?: number | null;
}

export interface TaskTemplateInput {
  name: string;
  description?: string | null;
  items: TaskTemplateItemInput[];
}

export type TaskInput = Omit<
  Task,
  "id" | "projectId" | "createdAt" | "updatedAt" | "project"
>;

export interface Project {
  id: string;
  name: string;
  description: string | null;
  assetType: string | null;
  status: ProjectStatus;
  projectNumber: string | null;
  bpRefNo: string | null;
  // Display name; derived server-side from projectManagerId when that's set.
  projectManager: string | null;
  // The linked user account — notifications go to this user.
  projectManagerId: string | null;
  projectDirector: string | null;
  projectSponsor: string | null;
  location: string | null;
  contractor: string | null;
  budget: string | null;
  latestApprovedBudget: string | null;
  contractValue: string | null;
  startDate: string | null;
  targetCompletionDate: string | null;
  actualCompletionDate: string | null;
  createdById: string | null;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  tasks?: Task[];
}

export type ProjectInput = Omit<
  Project,
  "id" | "createdById" | "createdBy" | "createdAt" | "updatedAt" | "tasks"
>;

export interface ActivityLogEntry {
  id: string;
  projectId: string | null;
  projectName: string;
  userId: string | null;
  userName: string;
  action: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  projectId: string;
  originalName: string;
  mimeType: string;
  size: number;
  meetingMinutesId: string | null;
  uploadedById: string | null;
  uploadedByName: string;
  createdAt: string;
}

export type RagStatus = "GREEN" | "AMBER" | "RED";

export interface MonthlyReport {
  id: string;
  projectId: string;
  reportingMonth: string;
  projectPhase: string;
  currentStatus: string;
  recentlyCompleted: string | null;
  monthlyLookahead: string | null;
  budgetHealth: RagStatus;
  budgetComments: string | null;
  scheduleHealth: RagStatus;
  scheduleComments: string | null;
  createdById: string | null;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export type MonthlyReportInput = Omit<
  MonthlyReport,
  "id" | "projectId" | "createdById" | "authorName" | "createdAt" | "updatedAt"
>;

export interface Milestone {
  id: string;
  projectId: string;
  wbsItem: string | null;
  taskActivity: string;
  percentComplete: number;
  startDate: string | null;
  originalCompletion: string | null;
  forecastedCompletion: string | null;
  actualCompletion: string | null;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type MilestoneInput = Omit<
  Milestone,
  "id" | "projectId" | "sortOrder" | "createdAt" | "updatedAt"
>;

export type CashFlowType = "ACTUAL" | "FORECAST";

export interface CashFlowEntry {
  id: string;
  projectId: string;
  month: string;
  type: CashFlowType;
  amount: string;
  createdAt: string;
  updatedAt: string;
}

export type CashFlowEntryInput = Omit<
  CashFlowEntry,
  "id" | "projectId" | "createdAt" | "updatedAt"
>;

export interface SiteVisit {
  id: string;
  projectId: string;
  visitDate: string;
  location: string;
  notes: string | null;
  discussionNotes: string | null;
  visitedById: string | null;
  visitedByName: string;
  createdAt: string;
  updatedAt: string;
}

export type SiteVisitInput = Omit<
  SiteVisit,
  "id" | "projectId" | "visitedById" | "visitedByName" | "createdAt" | "updatedAt"
>;

export interface SiteVisitPhoto {
  id: string;
  siteVisitId: string;
  originalName: string;
  mimeType: string;
  size: number;
  latitude: number | null;
  longitude: number | null;
  takenAt: string | null;
  uploadedById: string | null;
  uploadedByName: string;
  createdAt: string;
  siteVisit?: { id: string; location: string; visitDate: string };
  archiveMediaId: string | null;
  archiveSyncedAt: string | null;
  archiveSyncError: string | null;
}

export type ArchiveItemType = "ASSET" | "MEDIA" | "FILE";

export interface ArchiveLink {
  id: string;
  projectId: string;
  archiveType: ArchiveItemType;
  archiveId: string;
  label: string;
  url: string;
  createdById: string | null;
  createdByName: string;
  createdAt: string;
}

// Shapes returned by the Engineering Archive's own /api/search, proxied
// through this backend at /api/archive-search — only the fields the search
// UI actually displays, not every column the Archive's database has.
export interface ArchiveSearchResult {
  query: string;
  assets: Array<{ id: string; name: string; description: string | null }>;
  media: Array<{ id: string; fileName: string; kind: "PHOTO" | "VIDEO"; locationName: string | null }>;
  files: Array<{ id: string; fileName: string; category: string | null }>;
}

export type VariationStatus = "PROPOSED" | "APPROVED" | "REJECTED";

export interface Variation {
  id: string;
  projectId: string;
  reference: string | null;
  title: string;
  description: string | null;
  category: string | null;
  costImpact: string;
  timeImpactDays: number | null;
  status: VariationStatus;
  dateRaised: string;
  dateDecided: string | null;
  raisedById: string | null;
  raisedByName: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type VariationInput = Omit<
  Variation,
  | "id"
  | "projectId"
  | "dateDecided"
  | "raisedById"
  | "raisedByName"
  | "createdAt"
  | "updatedAt"
>;

export type RiskType = "RISK" | "OPPORTUNITY";

export type RiskLikelihood =
  | "RARE"
  | "UNLIKELY"
  | "POSSIBLE"
  | "LIKELY"
  | "ALMOST_CERTAIN";

export type RiskConsequence =
  | "INSIGNIFICANT"
  | "MINOR"
  | "MODERATE"
  | "MAJOR"
  | "SEVERE";

export type RiskStatus = "OPEN" | "MITIGATING" | "CLOSED";

export interface Risk {
  id: string;
  projectId: string;
  type: RiskType;
  title: string;
  description: string | null;
  category: string | null;
  inherentLikelihood: RiskLikelihood;
  inherentConsequence: RiskConsequence;
  residualLikelihood: RiskLikelihood | null;
  residualConsequence: RiskConsequence | null;
  mitigation: string | null;
  ownerName: string | null;
  dueDate: string | null;
  status: RiskStatus;
  createdById: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
}

export type RiskInput = Omit<
  Risk,
  "id" | "projectId" | "createdById" | "createdByName" | "createdAt" | "updatedAt" | "project"
>;

export type ActionType = "ACTION" | "DECISION";

export type ActionItemStatus = "OPEN" | "IN_PROGRESS" | "DONE";

export interface ActionItem {
  id: string;
  projectId: string;
  type: ActionType;
  title: string;
  description: string | null;
  category: string | null;
  ownerName: string | null;
  dueDate: string | null;
  status: ActionItemStatus;
  dateRaised: string;
  dateClosed: string | null;
  raisedById: string | null;
  raisedByName: string;
  notes: string | null;
  meetingMinutesId: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
}

export type ActionItemInput = Omit<
  ActionItem,
  | "id"
  | "projectId"
  | "dateClosed"
  | "raisedById"
  | "raisedByName"
  | "createdAt"
  | "updatedAt"
  | "project"
>;

export interface SuggestedAction {
  title: string;
  ownerName: string | null;
  dueDateHint: string | null;
}

// What the AI transcript-to-minutes endpoint returns — a draft to review
// and edit before it's saved as a real MeetingMinutes record, using the
// same SuggestedAction shape the existing extract-actions feature returns.
export interface MeetingMinutesDraft {
  title: string | null;
  meetingType: string | null;
  summary: string | null;
  attendees: string | null;
  notes: string | null;
  actions: SuggestedAction[];
}

export interface Stakeholder {
  id: string;
  projectId: string;
  name: string;
  organization: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type StakeholderInput = Omit<
  Stakeholder,
  "id" | "projectId" | "createdAt" | "updatedAt"
>;

export type PermitStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Permit {
  id: string;
  projectId: string;
  title: string;
  category: string | null;
  referenceNumber: string | null;
  issuingAuthority: string | null;
  status: PermitStatus;
  dateApplied: string | null;
  dateApproved: string | null;
  expiryDate: string | null;
  notes: string | null;
  createdById: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
}

export type PermitInput = Omit<
  Permit,
  "id" | "projectId" | "createdById" | "createdByName" | "createdAt" | "updatedAt" | "project"
>;

export type LessonType = "POSITIVE" | "NEGATIVE";

export interface LessonLearned {
  id: string;
  projectId: string;
  type: LessonType;
  title: string;
  category: string | null;
  description: string | null;
  recommendation: string | null;
  createdById: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string; assetType: string | null };
}

export type LessonLearnedInput = Omit<
  LessonLearned,
  "id" | "projectId" | "createdById" | "createdByName" | "createdAt" | "updatedAt" | "project"
>;

export type SqeCategory = "SAFETY" | "QUALITY" | "ENVIRONMENT";

export type SqeSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type SqeStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";

export type LimitType = "MAX" | "MIN";

export type SafetyInspectionStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";

export type TenderMethod = "OPEN" | "SELECTIVE" | "DIRECT_ENGAGE" | "EXPRESSION_OF_INTEREST";

export type TenderStatus = "PLANNED" | "ISSUED" | "EVALUATION" | "AWARDED" | "CANCELLED";

export interface SearchResult {
  type: string;
  typeLabel: string;
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  subtitle: string | null;
  date: string | null;
}

export interface SqeRecord {
  id: string;
  projectId: string;
  category: SqeCategory;
  severity: SqeSeverity;
  title: string;
  description: string | null;
  correctiveAction: string | null;
  dateOccurred: string;
  status: SqeStatus;
  dateClosed: string | null;
  reportedById: string | null;
  reportedByName: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
}

export type SqeRecordInput = Omit<
  SqeRecord,
  | "id"
  | "projectId"
  | "dateClosed"
  | "reportedById"
  | "reportedByName"
  | "createdAt"
  | "updatedAt"
  | "project"
>;

export type EotStatus = "SUBMITTED" | "APPROVED" | "REJECTED";

export interface EotClaim {
  id: string;
  projectId: string;
  reference: string | null;
  title: string;
  cause: string | null;
  description: string | null;
  daysClaimed: number;
  daysGranted: number | null;
  status: EotStatus;
  dateSubmitted: string;
  dateDecided: string | null;
  raisedById: string | null;
  raisedByName: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EotClaimInput = Omit<
  EotClaim,
  | "id"
  | "projectId"
  | "dateDecided"
  | "raisedById"
  | "raisedByName"
  | "createdAt"
  | "updatedAt"
>;

export type DelayStatus = "ONGOING" | "RESOLVED";

export interface Delay {
  id: string;
  projectId: string;
  title: string;
  category: string | null;
  description: string | null;
  responsibleParty: string | null;
  criticalPath: boolean;
  dateStarted: string;
  dateEnded: string | null;
  daysImpact: number | null;
  status: DelayStatus;
  mitigation: string | null;
  eotReference: string | null;
  notes: string | null;
  raisedById: string | null;
  raisedByName: string;
  createdAt: string;
  updatedAt: string;
}

export type DelayInput = Omit<
  Delay,
  "id" | "projectId" | "dateEnded" | "raisedById" | "raisedByName" | "createdAt" | "updatedAt"
> & { dateEnded: string | null };

export type ChecklistPhase = "COMMISSIONING" | "HANDOVER";

export type ChecklistItemStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETE"
  | "NOT_APPLICABLE";

export interface ChecklistItem {
  id: string;
  projectId: string;
  phase: ChecklistPhase;
  title: string;
  description: string | null;
  responsible: string | null;
  dueDate: string | null;
  completedDate: string | null;
  status: ChecklistItemStatus;
  notes: string | null;
  createdById: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export type ChecklistItemInput = Omit<
  ChecklistItem,
  | "id"
  | "projectId"
  | "completedDate"
  | "createdById"
  | "createdByName"
  | "createdAt"
  | "updatedAt"
>;

export type DefectStatus = "OPEN" | "RECTIFIED" | "VERIFIED" | "DISPUTED";

export interface DefectItem {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  location: string | null;
  category: string | null;
  assignedTo: string | null;
  dueDate: string | null;
  status: DefectStatus;
  dateRaised: string;
  dateClosed: string | null;
  retentionHeld: number | null;
  raisedById: string | null;
  raisedByName: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
}

export type DefectItemInput = Omit<
  DefectItem,
  | "id"
  | "projectId"
  | "dateClosed"
  | "raisedById"
  | "raisedByName"
  | "createdAt"
  | "updatedAt"
  | "project"
>;

export type PaymentClaimStatus = "SUBMITTED" | "CERTIFIED" | "DISPUTED" | "PAID";

export interface PaymentClaim {
  id: string;
  projectId: string;
  claimNumber: string;
  periodEnding: string | null;
  claimedAmount: number;
  certifiedAmount: number | null;
  status: PaymentClaimStatus;
  dateSubmitted: string;
  dateCertified: string | null;
  datePaid: string | null;
  raisedById: string | null;
  raisedByName: string;
  notes: string | null;
  contractId: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
}

export type PaymentClaimInput = Omit<
  PaymentClaim,
  | "id"
  | "projectId"
  | "dateCertified"
  | "datePaid"
  | "raisedById"
  | "raisedByName"
  | "createdAt"
  | "updatedAt"
  | "project"
>;

export type InsuranceWarrantyType = "INSURANCE" | "WARRANTY";

export interface InsuranceWarranty {
  id: string;
  projectId: string;
  type: InsuranceWarrantyType;
  title: string;
  provider: string | null;
  referenceNumber: string | null;
  coverageDetails: string | null;
  startDate: string | null;
  expiryDate: string | null;
  notes: string | null;
  createdById: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
}

export type InsuranceWarrantyInput = Omit<
  InsuranceWarranty,
  | "id"
  | "projectId"
  | "createdById"
  | "createdByName"
  | "createdAt"
  | "updatedAt"
  | "project"
>;

export type RfiStatus = "OPEN" | "ANSWERED" | "CLOSED";

export interface Rfi {
  id: string;
  projectId: string;
  rfiNumber: string;
  subject: string;
  question: string;
  response: string | null;
  raisedTo: string | null;
  status: RfiStatus;
  dateRaised: string;
  dateRequired: string | null;
  dateAnswered: string | null;
  raisedById: string | null;
  raisedByName: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
}

export type RfiInput = Omit<
  Rfi,
  | "id"
  | "projectId"
  | "dateAnswered"
  | "raisedById"
  | "raisedByName"
  | "createdAt"
  | "updatedAt"
  | "project"
>;

export type DocumentStatus = "DRAFT" | "FOR_REVIEW" | "APPROVED" | "SUPERSEDED";

export interface DocumentRecord {
  id: string;
  projectId: string;
  documentNumber: string;
  title: string;
  category: string | null;
  revision: string;
  status: DocumentStatus;
  issueDate: string | null;
  description: string | null;
  uploadedById: string | null;
  uploadedByName: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
}

export type DocumentRecordInput = Omit<
  DocumentRecord,
  | "id"
  | "projectId"
  | "uploadedById"
  | "uploadedByName"
  | "createdAt"
  | "updatedAt"
  | "project"
>;

export type EnquiryCategory = "NOISE" | "TRAFFIC" | "DUST" | "ACCESS" | "OTHER";

export type EnquiryStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface CommunityEnquiry {
  id: string;
  projectId: string;
  reference: string | null;
  category: EnquiryCategory;
  source: string | null;
  contactName: string | null;
  contactDetails: string | null;
  description: string;
  dateReceived: string;
  status: EnquiryStatus;
  assignedTo: string | null;
  resolution: string | null;
  dateResolved: string | null;
  loggedById: string | null;
  loggedByName: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
}

export type CommunityEnquiryInput = Omit<
  CommunityEnquiry,
  | "id"
  | "projectId"
  | "dateResolved"
  | "loggedById"
  | "loggedByName"
  | "createdAt"
  | "updatedAt"
  | "project"
>;

export type SubcontractorStatus = "ENGAGED" | "ACTIVE" | "COMPLETED" | "TERMINATED";

export interface Subcontractor {
  id: string;
  projectId: string;
  companyName: string;
  trade: string | null;
  contactName: string | null;
  contactDetails: string | null;
  contractValue: string | null;
  startDate: string | null;
  endDate: string | null;
  status: SubcontractorStatus;
  insuranceExpiry: string | null;
  notes: string | null;
  addedById: string | null;
  addedByName: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
}

export type SubcontractorInput = Omit<
  Subcontractor,
  | "id"
  | "projectId"
  | "addedById"
  | "addedByName"
  | "createdAt"
  | "updatedAt"
  | "project"
>;

export type ContractPartyType = "CONSULTANT" | "CONTRACTOR";
export type ContractStatus = "ACTIVE" | "COMPLETE" | "TERMINATED";

export interface ContractRecord {
  id: string;
  projectId: string;
  partyType: ContractPartyType;
  partyName: string;
  discipline: string | null;
  contractNumber: string | null;
  contractForm: string | null;
  contractValue: string | null;
  contingency: string | null;
  poValue: string | null;
  provisionalItemsValue: string | null;
  retentionPercent: string | null;
  defectsLiabilityMonths: number | null;
  executionDate: string | null;
  startDate: string | null;
  completionDate: string | null;
  status: ContractStatus;
  notes: string | null;
  addedById: string | null;
  addedByName: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
}

export type ContractRecordInput = Omit<
  ContractRecord,
  | "id"
  | "projectId"
  | "addedById"
  | "addedByName"
  | "createdAt"
  | "updatedAt"
  | "project"
>;

export interface MeetingMinutes {
  id: string;
  projectId: string;
  title: string | null;
  meetingDate: string;
  meetingType: string | null;
  location: string | null;
  attendees: string | null;
  summary: string | null;
  nextMeetingDate: string | null;
  notes: string | null;
  recordedById: string | null;
  recordedByName: string;
  createdAt: string;
  updatedAt: string;
}

export type MeetingMinutesInput = Omit<
  MeetingMinutes,
  "id" | "projectId" | "recordedById" | "recordedByName" | "createdAt" | "updatedAt"
>;

export type CorrespondenceDirection = "INCOMING" | "OUTGOING";

export type CorrespondenceStatus = "OPEN" | "CLOSED";

export interface Correspondence {
  id: string;
  projectId: string;
  reference: string | null;
  direction: CorrespondenceDirection;
  correspondent: string;
  subject: string;
  summary: string | null;
  dateSent: string;
  responseDueDate: string | null;
  status: CorrespondenceStatus;
  dateClosed: string | null;
  notes: string | null;
  loggedById: string | null;
  loggedByName: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
}

export type CorrespondenceInput = Omit<
  Correspondence,
  | "id"
  | "projectId"
  | "dateClosed"
  | "loggedById"
  | "loggedByName"
  | "createdAt"
  | "updatedAt"
  | "project"
>;

export interface TrainingRecord {
  id: string;
  projectId: string;
  personName: string;
  company: string | null;
  trainingType: string;
  completionDate: string;
  expiryDate: string | null;
  certificateNumber: string | null;
  notes: string | null;
  recordedById: string | null;
  recordedByName: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
}

export type TrainingRecordInput = Omit<
  TrainingRecord,
  | "id"
  | "projectId"
  | "recordedById"
  | "recordedByName"
  | "createdAt"
  | "updatedAt"
  | "project"
>;

export interface PerformanceReview {
  id: string;
  projectId: string;
  revieweeName: string;
  reviewPeriod: string | null;
  reviewDate: string;
  qualityRating: number;
  safetyRating: number;
  timelinessRating: number;
  communicationRating: number;
  comments: string | null;
  reviewedById: string | null;
  reviewedByName: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
}

export type PerformanceReviewInput = Omit<
  PerformanceReview,
  | "id"
  | "projectId"
  | "reviewedById"
  | "reviewedByName"
  | "createdAt"
  | "updatedAt"
  | "project"
>;

export interface ToolboxTalk {
  id: string;
  projectId: string;
  talkDate: string;
  topic: string;
  conductedBy: string;
  attendees: string | null;
  keyPoints: string | null;
  notes: string | null;
  recordedById: string | null;
  recordedByName: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
}

export type ToolboxTalkInput = Omit<
  ToolboxTalk,
  | "id"
  | "projectId"
  | "recordedById"
  | "recordedByName"
  | "createdAt"
  | "updatedAt"
  | "project"
>;

export interface EnvironmentalMonitoringRecord {
  id: string;
  projectId: string;
  parameter: string;
  location: string | null;
  monitoringDate: string;
  readingValue: number;
  unit: string;
  limitValue: number | null;
  limitType: LimitType;
  correctiveAction: string | null;
  notes: string | null;
  monitoredById: string | null;
  monitoredByName: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
}

export type EnvironmentalMonitoringRecordInput = Omit<
  EnvironmentalMonitoringRecord,
  | "id"
  | "projectId"
  | "monitoredById"
  | "monitoredByName"
  | "createdAt"
  | "updatedAt"
  | "project"
>;

export interface SafetyInspection {
  id: string;
  projectId: string;
  inspectionDate: string;
  inspectionType: string;
  location: string | null;
  conductedBy: string;
  score: number | null;
  findings: string | null;
  correctiveAction: string | null;
  status: SafetyInspectionStatus;
  dateClosed: string | null;
  recordedById: string | null;
  recordedByName: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
}

export type SafetyInspectionInput = Omit<
  SafetyInspection,
  | "id"
  | "projectId"
  | "dateClosed"
  | "recordedById"
  | "recordedByName"
  | "createdAt"
  | "updatedAt"
  | "project"
>;

export interface TenderPackage {
  id: string;
  projectId: string;
  packageNumber: string | null;
  title: string;
  description: string | null;
  method: TenderMethod;
  status: TenderStatus;
  dateIssued: string | null;
  closingDate: string | null;
  submissionsReceived: number | null;
  estimatedValue: number | null;
  awardedTo: string | null;
  awardedValue: number | null;
  dateAwarded: string | null;
  managedById: string | null;
  managedByName: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
}

export type TenderPackageInput = Omit<
  TenderPackage,
  | "id"
  | "projectId"
  | "dateAwarded"
  | "managedById"
  | "managedByName"
  | "createdAt"
  | "updatedAt"
  | "project"
>;

export interface UserOption {
  id: string;
  name: string;
}

export type ToolSuggestionCategory = "NEW_FEATURE" | "IMPROVEMENT" | "BUG" | "OTHER";
export type ToolSuggestionStatus = "OPEN" | "PLANNED" | "IN_PROGRESS" | "DONE" | "DECLINED";

export interface ToolSuggestion {
  id: string;
  title: string;
  description: string | null;
  category: ToolSuggestionCategory;
  status: ToolSuggestionStatus;
  response: string | null;
  createdById: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export type ToolSuggestionInput = Pick<
  ToolSuggestion,
  "title" | "description" | "category" | "status" | "response"
>;
