import {
  ActionItem,
  ActionItemInput,
  ActivityLogEntry,
  ArchiveItemType,
  ArchiveLink,
  ArchiveSearchResult,
  Attachment,
  CashFlowEntry,
  CashFlowEntryInput,
  ChecklistItem,
  ChecklistItemInput,
  CommunityEnquiry,
  CommunityEnquiryInput,
  ContractRecord,
  ContractRecordInput,
  DefectItem,
  DefectItemInput,
  DocumentRecord,
  DocumentRecordInput,
  EnvironmentalMonitoringRecord,
  EnvironmentalMonitoringRecordInput,
  Delay,
  DelayInput,
  EotClaim,
  EotClaimInput,
  InsuranceWarranty,
  InsuranceWarrantyInput,
  LessonLearned,
  LessonLearnedInput,
  ToolSuggestion,
  ToolSuggestionInput,
  TrimLink,
  TrimLinkInput,
  TenderSubmission,
  TenderSubmissionInput,
  UserOption,
  MeetingMinutes,
  MeetingMinutesInput,
  MeetingMinutesDraft,
  Correspondence,
  CorrespondenceInput,
  Milestone,
  MilestoneInput,
  MonthlyReport,
  MonthlyReportDraft,
  MonthlyReportInput,
  MonthlyReportWorkbook,
  SharePointFile,
  SharePointStatus,
  WorkbookImportSummary,
  WorkbookSyncResult,
  PaymentClaim,
  PaymentClaimInput,
  PerformanceReview,
  PerformanceReviewInput,
  Permit,
  PermitInput,
  Project,
  ProjectInput,
  Rfi,
  RfiInput,
  Risk,
  RiskInput,
  Role,
  SafetyInspection,
  SafetyInspectionInput,
  SearchResult,
  SiteVisit,
  SiteVisitInput,
  SiteVisitPhoto,
  SqeRecord,
  SqeRecordInput,
  Stakeholder,
  StakeholderInput,
  SuggestedAction,
  Subcontractor,
  SubcontractorInput,
  Task,
  TaskInput,
  TaskTemplate,
  TaskTemplateInput,
  TenderPackage,
  TenderPackageInput,
  ToolboxTalk,
  ToolboxTalkInput,
  TrainingRecord,
  TrainingRecordInput,
  User,
  Variation,
  VariationInput,
} from "./types";

const API_BASE = "/api";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type LoginResult =
  | { twoFactorRequired: false; user: User }
  | { twoFactorRequired: true; challengeToken: string };

export function login(email: string, password: string): Promise<LoginResult> {
  return fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
    .then((res) =>
      handle<User | { twoFactorRequired: true; challengeToken: string }>(res)
    )
    .then((body) =>
      "twoFactorRequired" in body && body.twoFactorRequired
        ? { twoFactorRequired: true as const, challengeToken: body.challengeToken }
        : { twoFactorRequired: false as const, user: body as User }
    );
}

export function loginWithTwoFactor(
  challengeToken: string,
  code: string
): Promise<User> {
  return fetch(`${API_BASE}/auth/login/2fa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeToken, code }),
  }).then((res) => handle(res));
}

export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
}

function postJson<T>(path: string, body: unknown): Promise<T> {
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((res) => handle<T>(res));
}

export function startTwoFactorSetup(password: string): Promise<TwoFactorSetup> {
  return postJson("/auth/2fa/setup", { password });
}

export function enableTwoFactor(code: string): Promise<{ recoveryCodes: string[] }> {
  return postJson("/auth/2fa/enable", { code });
}

export function disableTwoFactor(password: string, code: string): Promise<void> {
  return postJson("/auth/2fa/disable", { password, code });
}

export function regenerateRecoveryCodes(
  password: string,
  code: string
): Promise<{ recoveryCodes: string[] }> {
  return postJson("/auth/2fa/recovery-codes", { password, code });
}

export function getTwoFactorStatus(): Promise<{
  enabled: boolean;
  recoveryCodesRemaining: number;
}> {
  return fetch(`${API_BASE}/auth/2fa/status`).then((res) => handle(res));
}

export function deleteUser(id: string): Promise<void> {
  return fetch(`${API_BASE}/users/${id}`, { method: "DELETE" }).then((res) => handle(res));
}

export function resetUserTwoFactor(id: string): Promise<void> {
  return fetch(`${API_BASE}/users/${id}/2fa/reset`, { method: "POST" }).then(
    (res) => handle(res)
  );
}

export function logout(): Promise<void> {
  return fetch(`${API_BASE}/auth/logout`, { method: "POST" }).then((res) =>
    handle(res)
  );
}

export function getMe(): Promise<User> {
  return fetch(`${API_BASE}/auth/me`).then((res) => handle(res));
}

export function updateDigestPreference(emailDigestOptIn: boolean): Promise<{ emailDigestOptIn: boolean }> {
  return fetch(`${API_BASE}/auth/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emailDigestOptIn }),
  }).then((res) => handle(res));
}

export function updateUpcomingManagerFilter(
  upcomingManagerFilter: string | null
): Promise<{ upcomingManagerFilter: string | null }> {
  return fetch(`${API_BASE}/auth/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ upcomingManagerFilter }),
  }).then((res) => handle(res));
}

export function updateDashboardView(
  dashboardView: Record<string, unknown> | null
): Promise<{ dashboardView: Record<string, unknown> | null }> {
  return fetch(`${API_BASE}/auth/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dashboardView }),
  }).then((res) => handle(res));
}

export function getTrimLinks(): Promise<TrimLink[]> {
  return fetch(`${API_BASE}/trim-links`).then((res) => handle(res));
}

export function createTrimLink(data: Partial<TrimLinkInput>): Promise<TrimLink> {
  return fetch(`${API_BASE}/trim-links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateTrimLink(id: string, data: Partial<TrimLinkInput>): Promise<TrimLink> {
  return fetch(`${API_BASE}/trim-links/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteTrimLink(id: string): Promise<void> {
  return fetch(`${API_BASE}/trim-links/${id}`, { method: "DELETE" }).then((res) => handle(res));
}

export function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  return fetch(`${API_BASE}/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  }).then((res) => handle(res));
}

export function getProjects(): Promise<Project[]> {
  return fetch(`${API_BASE}/projects`).then((res) => handle(res));
}

export function getProject(id: string): Promise<Project> {
  return fetch(`${API_BASE}/projects/${id}`).then((res) => handle(res));
}

export function createProject(data: Partial<ProjectInput>): Promise<Project> {
  return fetch(`${API_BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateProject(
  id: string,
  data: Partial<ProjectInput>
): Promise<Project> {
  return fetch(`${API_BASE}/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

// Active users (id + name) for pickers like a project's Project Manager —
// available to everyone, unlike the admin-only getUsers().
export function getUserOptions(): Promise<UserOption[]> {
  return fetch(`${API_BASE}/user-options`).then((res) => handle(res));
}

export function getToolSuggestions(): Promise<ToolSuggestion[]> {
  return fetch(`${API_BASE}/tool-suggestions`).then((res) => handle(res));
}

export function createToolSuggestion(
  data: Partial<ToolSuggestionInput>
): Promise<ToolSuggestion> {
  return fetch(`${API_BASE}/tool-suggestions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateToolSuggestion(
  id: string,
  data: Partial<ToolSuggestionInput>
): Promise<ToolSuggestion> {
  return fetch(`${API_BASE}/tool-suggestions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteToolSuggestion(id: string): Promise<void> {
  return fetch(`${API_BASE}/tool-suggestions/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function deleteProject(id: string): Promise<void> {
  return fetch(`${API_BASE}/projects/${id}`, { method: "DELETE" }).then(
    (res) => handle(res)
  );
}

export function getUpcomingTasks(): Promise<Task[]> {
  return fetch(`${API_BASE}/tasks/upcoming`).then((res) => handle(res));
}

export function getPortfolioTasks(): Promise<Task[]> {
  return fetch(`${API_BASE}/tasks/portfolio`).then((res) => handle(res));
}

export function createPortfolioTask(data: Partial<TaskInput>): Promise<Task> {
  return fetch(`${API_BASE}/tasks/portfolio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function createTask(
  projectId: string,
  data: Partial<TaskInput>
): Promise<Task> {
  return fetch(`${API_BASE}/projects/${projectId}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateTask(
  id: string,
  data: Partial<TaskInput>
): Promise<Task> {
  return fetch(`${API_BASE}/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteTask(id: string): Promise<void> {
  return fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function getRecentActivity(): Promise<ActivityLogEntry[]> {
  return fetch(`${API_BASE}/activity/recent`).then((res) => handle(res));
}

export function getProjectActivity(projectId: string): Promise<ActivityLogEntry[]> {
  return fetch(`${API_BASE}/projects/${projectId}/activity`).then((res) =>
    handle(res)
  );
}

export function getAttachments(projectId: string): Promise<Attachment[]> {
  return fetch(`${API_BASE}/projects/${projectId}/attachments`).then((res) =>
    handle(res)
  );
}

export function uploadAttachment(
  projectId: string,
  file: File,
  meetingMinutesId?: string
): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);
  if (meetingMinutesId) formData.append("meetingMinutesId", meetingMinutesId);
  return fetch(`${API_BASE}/projects/${projectId}/attachments`, {
    method: "POST",
    body: formData,
  }).then((res) => handle(res));
}

export function deleteAttachment(id: string): Promise<void> {
  return fetch(`${API_BASE}/attachments/${id}`, { method: "DELETE" }).then(
    (res) => handle(res)
  );
}

export function attachmentDownloadUrl(id: string): string {
  return `${API_BASE}/attachments/${id}/download`;
}

export function getUsers(): Promise<User[]> {
  return fetch(`${API_BASE}/users`).then((res) => handle(res));
}

export function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: Role;
}): Promise<User> {
  return fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateUserRole(id: string, role: Role): Promise<User> {
  return fetch(`${API_BASE}/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  }).then((res) => handle(res));
}

export function setUserActive(id: string, active: boolean): Promise<User> {
  return fetch(`${API_BASE}/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active }),
  }).then((res) => handle(res));
}

export function getMonthlyReports(projectId: string): Promise<MonthlyReport[]> {
  return fetch(`${API_BASE}/projects/${projectId}/reports`).then((res) =>
    handle(res)
  );
}

export function getMonthlyReport(id: string): Promise<MonthlyReport> {
  return fetch(`${API_BASE}/reports/${id}`).then((res) => handle(res));
}

export function createMonthlyReport(
  projectId: string,
  data: Partial<MonthlyReportInput>
): Promise<MonthlyReport> {
  return fetch(`${API_BASE}/projects/${projectId}/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateMonthlyReport(
  id: string,
  data: Partial<MonthlyReportInput>
): Promise<MonthlyReport> {
  return fetch(`${API_BASE}/reports/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function getMonthlyReportDraft(projectId: string, month: string): Promise<MonthlyReportDraft> {
  return fetch(`${API_BASE}/projects/${projectId}/reports/draft?month=${encodeURIComponent(month)}`).then((res) =>
    handle(res)
  );
}

export function refreshMonthlyReport(id: string): Promise<MonthlyReportDraft> {
  return fetch(`${API_BASE}/reports/${id}/refresh`).then((res) => handle(res));
}

export function getMonthlyReportWorkbook(projectId: string): Promise<MonthlyReportWorkbook> {
  return fetch(`${API_BASE}/projects/${projectId}/reports/workbook`).then((res) => handle(res));
}

export function uploadMonthlyReportWorkbook(
  projectId: string,
  file: File
): Promise<WorkbookImportSummary & { workbook: MonthlyReportWorkbook }> {
  const formData = new FormData();
  formData.append("file", file);
  return fetch(`${API_BASE}/projects/${projectId}/reports/workbook`, {
    method: "POST",
    body: formData,
  }).then((res) => handle(res));
}

export function unlinkMonthlyReportWorkbook(projectId: string): Promise<void> {
  return fetch(`${API_BASE}/projects/${projectId}/reports/workbook`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function monthlyReportWorkbookDownloadUrl(projectId: string): string {
  return `${API_BASE}/projects/${projectId}/reports/workbook/download`;
}

export function syncMonthlyReport(id: string, log: boolean): Promise<WorkbookSyncResult> {
  return fetch(`${API_BASE}/reports/${id}/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ log }),
  }).then((res) => handle(res));
}

export function getSharePointStatus(): Promise<SharePointStatus> {
  return fetch(`${API_BASE}/sharepoint/status`).then((res) => handle(res));
}

export function startSharePointConnect(): Promise<{
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}> {
  return fetch(`${API_BASE}/sharepoint/connect`, { method: "POST" }).then((res) => handle(res));
}

export function pollSharePointConnect(): Promise<{ status: "pending" | "connected" | "expired" }> {
  return fetch(`${API_BASE}/sharepoint/connect/poll`, { method: "POST" }).then((res) => handle(res));
}

export function disconnectSharePoint(): Promise<void> {
  return fetch(`${API_BASE}/sharepoint/connection`, { method: "DELETE" }).then((res) => handle(res));
}

export function listSharePointReportFiles(
  projectId: string
): Promise<{ files: SharePointFile[]; suggestedItemId: string | null }> {
  return fetch(`${API_BASE}/projects/${projectId}/reports/sharepoint/files`).then((res) => handle(res));
}

export function linkSharePointWorkbook(
  projectId: string,
  file: Pick<SharePointFile, "driveId" | "itemId">
): Promise<MonthlyReportWorkbook> {
  return fetch(`${API_BASE}/projects/${projectId}/reports/sharepoint/link`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ driveId: file.driveId, itemId: file.itemId }),
  }).then((res) => handle(res));
}

export function pullSharePointWorkbook(projectId: string): Promise<WorkbookImportSummary> {
  return fetch(`${API_BASE}/projects/${projectId}/reports/sharepoint/pull`, { method: "POST" }).then((res) =>
    handle(res)
  );
}

export function deleteMonthlyReport(id: string): Promise<void> {
  return fetch(`${API_BASE}/reports/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function getTaskTemplates(): Promise<TaskTemplate[]> {
  return fetch(`${API_BASE}/task-templates`).then((res) => handle(res));
}

export function createTaskTemplate(data: TaskTemplateInput): Promise<TaskTemplate> {
  return fetch(`${API_BASE}/task-templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateTaskTemplate(
  id: string,
  data: Partial<TaskTemplateInput>
): Promise<TaskTemplate> {
  return fetch(`${API_BASE}/task-templates/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteTaskTemplate(id: string): Promise<void> {
  return fetch(`${API_BASE}/task-templates/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function applyTaskTemplate(id: string, projectId: string): Promise<Task[]> {
  return fetch(`${API_BASE}/task-templates/${id}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId }),
  }).then((res) => handle(res));
}

export function getMilestones(projectId: string): Promise<Milestone[]> {
  return fetch(`${API_BASE}/projects/${projectId}/milestones`).then((res) =>
    handle(res)
  );
}

export function createMilestone(
  projectId: string,
  data: Partial<MilestoneInput>
): Promise<Milestone> {
  return fetch(`${API_BASE}/projects/${projectId}/milestones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateMilestone(
  id: string,
  data: Partial<MilestoneInput>
): Promise<Milestone> {
  return fetch(`${API_BASE}/milestones/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteMilestone(id: string): Promise<void> {
  return fetch(`${API_BASE}/milestones/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function reorderMilestone(
  id: string,
  direction: "up" | "down"
): Promise<Milestone[]> {
  return fetch(`${API_BASE}/milestones/${id}/reorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ direction }),
  }).then((res) => handle(res));
}

export function getCashFlowEntries(projectId: string): Promise<CashFlowEntry[]> {
  return fetch(`${API_BASE}/projects/${projectId}/cashflow`).then((res) =>
    handle(res)
  );
}

export function getAllCashFlowEntries(): Promise<CashFlowEntry[]> {
  return fetch(`${API_BASE}/cashflow`).then((res) => handle(res));
}

export function upsertCashFlowEntry(
  projectId: string,
  data: Partial<CashFlowEntryInput>
): Promise<CashFlowEntry> {
  return fetch(`${API_BASE}/projects/${projectId}/cashflow`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateCashFlowEntry(
  id: string,
  data: Partial<CashFlowEntryInput>
): Promise<CashFlowEntry> {
  return fetch(`${API_BASE}/cashflow/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteCashFlowEntry(id: string): Promise<void> {
  return fetch(`${API_BASE}/cashflow/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function getSiteVisits(projectId: string): Promise<SiteVisit[]> {
  return fetch(`${API_BASE}/projects/${projectId}/site-visits`).then((res) =>
    handle(res)
  );
}

export function createSiteVisit(
  projectId: string,
  data: Partial<SiteVisitInput>
): Promise<SiteVisit> {
  return fetch(`${API_BASE}/projects/${projectId}/site-visits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateSiteVisit(
  id: string,
  data: Partial<SiteVisitInput>
): Promise<SiteVisit> {
  return fetch(`${API_BASE}/site-visits/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteSiteVisit(id: string): Promise<void> {
  return fetch(`${API_BASE}/site-visits/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function getProjectSitePhotos(projectId: string): Promise<SiteVisitPhoto[]> {
  return fetch(`${API_BASE}/projects/${projectId}/site-visit-photos`).then((res) =>
    handle(res)
  );
}

export function getSiteVisitPhotos(siteVisitId: string): Promise<SiteVisitPhoto[]> {
  return fetch(`${API_BASE}/site-visits/${siteVisitId}/photos`).then((res) =>
    handle(res)
  );
}

export function uploadSiteVisitPhotos(
  siteVisitId: string,
  files: File[]
): Promise<SiteVisitPhoto[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("photos", file));
  return fetch(`${API_BASE}/site-visits/${siteVisitId}/photos`, {
    method: "POST",
    body: formData,
  }).then((res) => handle(res));
}

export function deleteSiteVisitPhoto(id: string): Promise<void> {
  return fetch(`${API_BASE}/site-visit-photos/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function siteVisitPhotoFileUrl(id: string): string {
  return `${API_BASE}/site-visit-photos/${id}/file`;
}

export function syncSiteVisitPhotoToArchive(id: string): Promise<SiteVisitPhoto> {
  return fetch(`${API_BASE}/site-visit-photos/${id}/sync-to-archive`, { method: "POST" }).then(
    (res) => handle(res)
  );
}

export function getArchiveLinks(projectId: string): Promise<ArchiveLink[]> {
  return fetch(`${API_BASE}/projects/${projectId}/archive-links`).then((res) => handle(res));
}

export function createArchiveLink(
  projectId: string,
  data: { archiveType: ArchiveItemType; archiveId: string; label: string }
): Promise<ArchiveLink> {
  return fetch(`${API_BASE}/projects/${projectId}/archive-links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteArchiveLink(id: string): Promise<void> {
  return fetch(`${API_BASE}/archive-links/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function searchArchive(query: string): Promise<ArchiveSearchResult> {
  return fetch(`${API_BASE}/archive-search?q=${encodeURIComponent(query)}`).then((res) =>
    handle(res)
  );
}

export function getVariations(projectId: string): Promise<Variation[]> {
  return fetch(`${API_BASE}/projects/${projectId}/variations`).then((res) =>
    handle(res)
  );
}

export function getAllVariations(): Promise<Variation[]> {
  return fetch(`${API_BASE}/variations`).then((res) => handle(res));
}

export function createVariation(
  projectId: string,
  data: Partial<VariationInput>
): Promise<Variation> {
  return fetch(`${API_BASE}/projects/${projectId}/variations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateVariation(
  id: string,
  data: Partial<VariationInput>
): Promise<Variation> {
  return fetch(`${API_BASE}/variations/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteVariation(id: string): Promise<void> {
  return fetch(`${API_BASE}/variations/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function getRisks(projectId: string): Promise<Risk[]> {
  return fetch(`${API_BASE}/projects/${projectId}/risks`).then((res) => handle(res));
}

export function getAllRisks(): Promise<Risk[]> {
  return fetch(`${API_BASE}/risks`).then((res) => handle(res));
}

export function createRisk(
  projectId: string,
  data: Partial<RiskInput>
): Promise<Risk> {
  return fetch(`${API_BASE}/projects/${projectId}/risks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateRisk(id: string, data: Partial<RiskInput>): Promise<Risk> {
  return fetch(`${API_BASE}/risks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteRisk(id: string): Promise<void> {
  return fetch(`${API_BASE}/risks/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function getActionItems(projectId: string): Promise<ActionItem[]> {
  return fetch(`${API_BASE}/projects/${projectId}/action-items`).then((res) =>
    handle(res)
  );
}

export function getAllActionItems(): Promise<ActionItem[]> {
  return fetch(`${API_BASE}/action-items`).then((res) => handle(res));
}

export function createActionItem(
  projectId: string,
  data: Partial<ActionItemInput>
): Promise<ActionItem> {
  return fetch(`${API_BASE}/projects/${projectId}/action-items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateActionItem(
  id: string,
  data: Partial<ActionItemInput>
): Promise<ActionItem> {
  return fetch(`${API_BASE}/action-items/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteActionItem(id: string): Promise<void> {
  return fetch(`${API_BASE}/action-items/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function getStakeholders(projectId: string): Promise<Stakeholder[]> {
  return fetch(`${API_BASE}/projects/${projectId}/stakeholders`).then((res) =>
    handle(res)
  );
}

export function createStakeholder(
  projectId: string,
  data: Partial<StakeholderInput>
): Promise<Stakeholder> {
  return fetch(`${API_BASE}/projects/${projectId}/stakeholders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateStakeholder(
  id: string,
  data: Partial<StakeholderInput>
): Promise<Stakeholder> {
  return fetch(`${API_BASE}/stakeholders/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteStakeholder(id: string): Promise<void> {
  return fetch(`${API_BASE}/stakeholders/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function getPermits(projectId: string): Promise<Permit[]> {
  return fetch(`${API_BASE}/projects/${projectId}/permits`).then((res) => handle(res));
}

export function getAllPermits(): Promise<Permit[]> {
  return fetch(`${API_BASE}/permits`).then((res) => handle(res));
}

export function createPermit(
  projectId: string,
  data: Partial<PermitInput>
): Promise<Permit> {
  return fetch(`${API_BASE}/projects/${projectId}/permits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updatePermit(id: string, data: Partial<PermitInput>): Promise<Permit> {
  return fetch(`${API_BASE}/permits/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deletePermit(id: string): Promise<void> {
  return fetch(`${API_BASE}/permits/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function getLessonsLearned(projectId: string): Promise<LessonLearned[]> {
  return fetch(`${API_BASE}/projects/${projectId}/lessons-learned`).then((res) =>
    handle(res)
  );
}

export function getAllLessonsLearned(): Promise<LessonLearned[]> {
  return fetch(`${API_BASE}/lessons-learned`).then((res) => handle(res));
}

export function createLessonLearned(
  projectId: string,
  data: Partial<LessonLearnedInput>
): Promise<LessonLearned> {
  return fetch(`${API_BASE}/projects/${projectId}/lessons-learned`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateLessonLearned(
  id: string,
  data: Partial<LessonLearnedInput>
): Promise<LessonLearned> {
  return fetch(`${API_BASE}/lessons-learned/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteLessonLearned(id: string): Promise<void> {
  return fetch(`${API_BASE}/lessons-learned/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function getSqeRecords(projectId: string): Promise<SqeRecord[]> {
  return fetch(`${API_BASE}/projects/${projectId}/sqe`).then((res) => handle(res));
}

export function getAllSqeRecords(): Promise<SqeRecord[]> {
  return fetch(`${API_BASE}/sqe`).then((res) => handle(res));
}

export function createSqeRecord(
  projectId: string,
  data: Partial<SqeRecordInput>
): Promise<SqeRecord> {
  return fetch(`${API_BASE}/projects/${projectId}/sqe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateSqeRecord(
  id: string,
  data: Partial<SqeRecordInput>
): Promise<SqeRecord> {
  return fetch(`${API_BASE}/sqe/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteSqeRecord(id: string): Promise<void> {
  return fetch(`${API_BASE}/sqe/${id}`, { method: "DELETE" }).then((res) => handle(res));
}

export function getEotClaims(projectId: string): Promise<EotClaim[]> {
  return fetch(`${API_BASE}/projects/${projectId}/eot-claims`).then((res) => handle(res));
}

export function getAllEotClaims(): Promise<EotClaim[]> {
  return fetch(`${API_BASE}/eot-claims`).then((res) => handle(res));
}

export function createEotClaim(
  projectId: string,
  data: Partial<EotClaimInput>
): Promise<EotClaim> {
  return fetch(`${API_BASE}/projects/${projectId}/eot-claims`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateEotClaim(
  id: string,
  data: Partial<EotClaimInput>
): Promise<EotClaim> {
  return fetch(`${API_BASE}/eot-claims/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteEotClaim(id: string): Promise<void> {
  return fetch(`${API_BASE}/eot-claims/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function getDelays(projectId: string): Promise<Delay[]> {
  return fetch(`${API_BASE}/projects/${projectId}/delays`).then((res) => handle(res));
}

export function createDelay(projectId: string, data: Partial<DelayInput>): Promise<Delay> {
  return fetch(`${API_BASE}/projects/${projectId}/delays`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateDelay(id: string, data: Partial<DelayInput>): Promise<Delay> {
  return fetch(`${API_BASE}/delays/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteDelay(id: string): Promise<void> {
  return fetch(`${API_BASE}/delays/${id}`, { method: "DELETE" }).then((res) => handle(res));
}

export function getChecklistItems(projectId: string): Promise<ChecklistItem[]> {
  return fetch(`${API_BASE}/projects/${projectId}/checklist-items`).then((res) =>
    handle(res)
  );
}

export function createChecklistItem(
  projectId: string,
  data: Partial<ChecklistItemInput>
): Promise<ChecklistItem> {
  return fetch(`${API_BASE}/projects/${projectId}/checklist-items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateChecklistItem(
  id: string,
  data: Partial<ChecklistItemInput>
): Promise<ChecklistItem> {
  return fetch(`${API_BASE}/checklist-items/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteChecklistItem(id: string): Promise<void> {
  return fetch(`${API_BASE}/checklist-items/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function getDefects(projectId: string): Promise<DefectItem[]> {
  return fetch(`${API_BASE}/projects/${projectId}/defects`).then((res) => handle(res));
}

export function getAllDefects(): Promise<DefectItem[]> {
  return fetch(`${API_BASE}/defects`).then((res) => handle(res));
}

export function createDefect(
  projectId: string,
  data: Partial<DefectItemInput>
): Promise<DefectItem> {
  return fetch(`${API_BASE}/projects/${projectId}/defects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateDefect(
  id: string,
  data: Partial<DefectItemInput>
): Promise<DefectItem> {
  return fetch(`${API_BASE}/defects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteDefect(id: string): Promise<void> {
  return fetch(`${API_BASE}/defects/${id}`, { method: "DELETE" }).then((res) => handle(res));
}

export function getPaymentClaims(projectId: string): Promise<PaymentClaim[]> {
  return fetch(`${API_BASE}/projects/${projectId}/payment-claims`).then((res) => handle(res));
}

export function getAllPaymentClaims(): Promise<PaymentClaim[]> {
  return fetch(`${API_BASE}/payment-claims`).then((res) => handle(res));
}

export function createPaymentClaim(
  projectId: string,
  data: Partial<PaymentClaimInput>
): Promise<PaymentClaim> {
  return fetch(`${API_BASE}/projects/${projectId}/payment-claims`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updatePaymentClaim(
  id: string,
  data: Partial<PaymentClaimInput>
): Promise<PaymentClaim> {
  return fetch(`${API_BASE}/payment-claims/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deletePaymentClaim(id: string): Promise<void> {
  return fetch(`${API_BASE}/payment-claims/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function getInsuranceWarranties(projectId: string): Promise<InsuranceWarranty[]> {
  return fetch(`${API_BASE}/projects/${projectId}/insurance-warranties`).then((res) =>
    handle(res)
  );
}

export function getAllInsuranceWarranties(): Promise<InsuranceWarranty[]> {
  return fetch(`${API_BASE}/insurance-warranties`).then((res) => handle(res));
}

export function createInsuranceWarranty(
  projectId: string,
  data: Partial<InsuranceWarrantyInput>
): Promise<InsuranceWarranty> {
  return fetch(`${API_BASE}/projects/${projectId}/insurance-warranties`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateInsuranceWarranty(
  id: string,
  data: Partial<InsuranceWarrantyInput>
): Promise<InsuranceWarranty> {
  return fetch(`${API_BASE}/insurance-warranties/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteInsuranceWarranty(id: string): Promise<void> {
  return fetch(`${API_BASE}/insurance-warranties/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function getRfis(projectId: string): Promise<Rfi[]> {
  return fetch(`${API_BASE}/projects/${projectId}/rfis`).then((res) => handle(res));
}

export function getAllRfis(): Promise<Rfi[]> {
  return fetch(`${API_BASE}/rfis`).then((res) => handle(res));
}

export function createRfi(projectId: string, data: Partial<RfiInput>): Promise<Rfi> {
  return fetch(`${API_BASE}/projects/${projectId}/rfis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateRfi(id: string, data: Partial<RfiInput>): Promise<Rfi> {
  return fetch(`${API_BASE}/rfis/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteRfi(id: string): Promise<void> {
  return fetch(`${API_BASE}/rfis/${id}`, { method: "DELETE" }).then((res) => handle(res));
}

export function getDocuments(projectId: string): Promise<DocumentRecord[]> {
  return fetch(`${API_BASE}/projects/${projectId}/documents`).then((res) => handle(res));
}

export function getAllDocuments(): Promise<DocumentRecord[]> {
  return fetch(`${API_BASE}/documents`).then((res) => handle(res));
}

export function createDocument(
  projectId: string,
  data: Partial<DocumentRecordInput>
): Promise<DocumentRecord> {
  return fetch(`${API_BASE}/projects/${projectId}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateDocument(
  id: string,
  data: Partial<DocumentRecordInput>
): Promise<DocumentRecord> {
  return fetch(`${API_BASE}/documents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteDocument(id: string): Promise<void> {
  return fetch(`${API_BASE}/documents/${id}`, { method: "DELETE" }).then((res) => handle(res));
}

export function getCommunityEnquiries(projectId: string): Promise<CommunityEnquiry[]> {
  return fetch(`${API_BASE}/projects/${projectId}/community-enquiries`).then((res) =>
    handle(res)
  );
}

export function getAllCommunityEnquiries(): Promise<CommunityEnquiry[]> {
  return fetch(`${API_BASE}/community-enquiries`).then((res) => handle(res));
}

export function createCommunityEnquiry(
  projectId: string,
  data: Partial<CommunityEnquiryInput>
): Promise<CommunityEnquiry> {
  return fetch(`${API_BASE}/projects/${projectId}/community-enquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateCommunityEnquiry(
  id: string,
  data: Partial<CommunityEnquiryInput>
): Promise<CommunityEnquiry> {
  return fetch(`${API_BASE}/community-enquiries/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteCommunityEnquiry(id: string): Promise<void> {
  return fetch(`${API_BASE}/community-enquiries/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function getSubcontractors(projectId: string): Promise<Subcontractor[]> {
  return fetch(`${API_BASE}/projects/${projectId}/subcontractors`).then((res) => handle(res));
}

export function getAllSubcontractors(): Promise<Subcontractor[]> {
  return fetch(`${API_BASE}/subcontractors`).then((res) => handle(res));
}

export function createSubcontractor(
  projectId: string,
  data: Partial<SubcontractorInput>
): Promise<Subcontractor> {
  return fetch(`${API_BASE}/projects/${projectId}/subcontractors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateSubcontractor(
  id: string,
  data: Partial<SubcontractorInput>
): Promise<Subcontractor> {
  return fetch(`${API_BASE}/subcontractors/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteSubcontractor(id: string): Promise<void> {
  return fetch(`${API_BASE}/subcontractors/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function getContracts(projectId: string): Promise<ContractRecord[]> {
  return fetch(`${API_BASE}/projects/${projectId}/contracts`).then((res) => handle(res));
}

export function createContract(
  projectId: string,
  data: Partial<ContractRecordInput>
): Promise<ContractRecord> {
  return fetch(`${API_BASE}/projects/${projectId}/contracts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateContract(
  id: string,
  data: Partial<ContractRecordInput>
): Promise<ContractRecord> {
  return fetch(`${API_BASE}/contracts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteContract(id: string): Promise<void> {
  return fetch(`${API_BASE}/contracts/${id}`, { method: "DELETE" }).then((res) => handle(res));
}

export function getMeetingMinutes(projectId: string): Promise<MeetingMinutes[]> {
  return fetch(`${API_BASE}/projects/${projectId}/meeting-minutes`).then((res) => handle(res));
}

export function createMeetingMinutes(
  projectId: string,
  data: Partial<MeetingMinutesInput>
): Promise<MeetingMinutes> {
  return fetch(`${API_BASE}/projects/${projectId}/meeting-minutes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateMeetingMinutes(
  id: string,
  data: Partial<MeetingMinutesInput>
): Promise<MeetingMinutes> {
  return fetch(`${API_BASE}/meeting-minutes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteMeetingMinutes(id: string): Promise<void> {
  return fetch(`${API_BASE}/meeting-minutes/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function extractMeetingActions(
  meetingId: string
): Promise<{ actions: SuggestedAction[] }> {
  return fetch(`${API_BASE}/meeting-minutes/${meetingId}/ai/extract-actions`, {
    method: "POST",
  }).then((res) => handle(res));
}

// Generation runs as a background job on the server (a long transcript takes
// longer than a proxy will hold one request open), so this starts it and then
// polls until it finishes — callers still just await a draft.
export async function generateMeetingMinutesDraft(
  projectId: string,
  input: { text?: string; file?: File; onProgress?: (message: string) => void }
): Promise<MeetingMinutesDraft> {
  const formData = new FormData();
  if (input.text) formData.append("text", input.text);
  if (input.file) formData.append("file", input.file);
  const base = `${API_BASE}/projects/${projectId}/meeting-minutes/ai/generate-draft`;
  const { jobId } = await fetch(base, { method: "POST", body: formData }).then((res) =>
    handle<{ jobId: string }>(res)
  );

  const deadline = Date.now() + 20 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const job = await fetch(`${base}/${jobId}`).then((res) =>
      handle<{
        status: "running" | "done" | "error";
        progress: string;
        draft?: MeetingMinutesDraft;
        error?: string;
      }>(res)
    );
    if (job.status === "done" && job.draft) return job.draft;
    if (job.status === "error") throw new Error(job.error || "Failed to generate from transcript");
    input.onProgress?.(job.progress);
  }
  throw new Error("Generating the minutes took too long — please try again");
}

export function getCorrespondence(projectId: string): Promise<Correspondence[]> {
  return fetch(`${API_BASE}/projects/${projectId}/correspondence`).then((res) => handle(res));
}

export function getAllCorrespondence(): Promise<Correspondence[]> {
  return fetch(`${API_BASE}/correspondence`).then((res) => handle(res));
}

export function createCorrespondence(
  projectId: string,
  data: Partial<CorrespondenceInput>
): Promise<Correspondence> {
  return fetch(`${API_BASE}/projects/${projectId}/correspondence`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateCorrespondence(
  id: string,
  data: Partial<CorrespondenceInput>
): Promise<Correspondence> {
  return fetch(`${API_BASE}/correspondence/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteCorrespondence(id: string): Promise<void> {
  return fetch(`${API_BASE}/correspondence/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function getTrainingRecords(projectId: string): Promise<TrainingRecord[]> {
  return fetch(`${API_BASE}/projects/${projectId}/training-records`).then((res) => handle(res));
}

export function getAllTrainingRecords(): Promise<TrainingRecord[]> {
  return fetch(`${API_BASE}/training-records`).then((res) => handle(res));
}

export function createTrainingRecord(
  projectId: string,
  data: Partial<TrainingRecordInput>
): Promise<TrainingRecord> {
  return fetch(`${API_BASE}/projects/${projectId}/training-records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateTrainingRecord(
  id: string,
  data: Partial<TrainingRecordInput>
): Promise<TrainingRecord> {
  return fetch(`${API_BASE}/training-records/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteTrainingRecord(id: string): Promise<void> {
  return fetch(`${API_BASE}/training-records/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function getPerformanceReviews(projectId: string): Promise<PerformanceReview[]> {
  return fetch(`${API_BASE}/projects/${projectId}/performance-reviews`).then((res) =>
    handle(res)
  );
}

export function getAllPerformanceReviews(): Promise<PerformanceReview[]> {
  return fetch(`${API_BASE}/performance-reviews`).then((res) => handle(res));
}

export function createPerformanceReview(
  projectId: string,
  data: Partial<PerformanceReviewInput>
): Promise<PerformanceReview> {
  return fetch(`${API_BASE}/projects/${projectId}/performance-reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updatePerformanceReview(
  id: string,
  data: Partial<PerformanceReviewInput>
): Promise<PerformanceReview> {
  return fetch(`${API_BASE}/performance-reviews/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deletePerformanceReview(id: string): Promise<void> {
  return fetch(`${API_BASE}/performance-reviews/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function getToolboxTalks(projectId: string): Promise<ToolboxTalk[]> {
  return fetch(`${API_BASE}/projects/${projectId}/toolbox-talks`).then((res) => handle(res));
}

export function createToolboxTalk(
  projectId: string,
  data: Partial<ToolboxTalkInput>
): Promise<ToolboxTalk> {
  return fetch(`${API_BASE}/projects/${projectId}/toolbox-talks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateToolboxTalk(
  id: string,
  data: Partial<ToolboxTalkInput>
): Promise<ToolboxTalk> {
  return fetch(`${API_BASE}/toolbox-talks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteToolboxTalk(id: string): Promise<void> {
  return fetch(`${API_BASE}/toolbox-talks/${id}`, { method: "DELETE" }).then((res) => handle(res));
}

export function getEnvironmentalMonitoring(
  projectId: string
): Promise<EnvironmentalMonitoringRecord[]> {
  return fetch(`${API_BASE}/projects/${projectId}/environmental-monitoring`).then((res) =>
    handle(res)
  );
}

export function getAllEnvironmentalMonitoring(): Promise<EnvironmentalMonitoringRecord[]> {
  return fetch(`${API_BASE}/environmental-monitoring`).then((res) => handle(res));
}

export function createEnvironmentalMonitoring(
  projectId: string,
  data: Partial<EnvironmentalMonitoringRecordInput>
): Promise<EnvironmentalMonitoringRecord> {
  return fetch(`${API_BASE}/projects/${projectId}/environmental-monitoring`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateEnvironmentalMonitoring(
  id: string,
  data: Partial<EnvironmentalMonitoringRecordInput>
): Promise<EnvironmentalMonitoringRecord> {
  return fetch(`${API_BASE}/environmental-monitoring/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteEnvironmentalMonitoring(id: string): Promise<void> {
  return fetch(`${API_BASE}/environmental-monitoring/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function getSafetyInspections(projectId: string): Promise<SafetyInspection[]> {
  return fetch(`${API_BASE}/projects/${projectId}/safety-inspections`).then((res) => handle(res));
}

export function getAllSafetyInspections(): Promise<SafetyInspection[]> {
  return fetch(`${API_BASE}/safety-inspections`).then((res) => handle(res));
}

export function createSafetyInspection(
  projectId: string,
  data: Partial<SafetyInspectionInput>
): Promise<SafetyInspection> {
  return fetch(`${API_BASE}/projects/${projectId}/safety-inspections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateSafetyInspection(
  id: string,
  data: Partial<SafetyInspectionInput>
): Promise<SafetyInspection> {
  return fetch(`${API_BASE}/safety-inspections/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteSafetyInspection(id: string): Promise<void> {
  return fetch(`${API_BASE}/safety-inspections/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function getTenderPackages(projectId: string): Promise<TenderPackage[]> {
  return fetch(`${API_BASE}/projects/${projectId}/tender-packages`).then((res) => handle(res));
}

export function getAllTenderPackages(): Promise<TenderPackage[]> {
  return fetch(`${API_BASE}/tender-packages`).then((res) => handle(res));
}

export function createTenderPackage(
  projectId: string,
  data: Partial<TenderPackageInput>
): Promise<TenderPackage> {
  return fetch(`${API_BASE}/projects/${projectId}/tender-packages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateTenderPackage(
  id: string,
  data: Partial<TenderPackageInput>
): Promise<TenderPackage> {
  return fetch(`${API_BASE}/tender-packages/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteTenderPackage(id: string): Promise<void> {
  return fetch(`${API_BASE}/tender-packages/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function getTenderSubmissions(projectId: string): Promise<TenderSubmission[]> {
  return fetch(`${API_BASE}/projects/${projectId}/tender-submissions`).then((res) =>
    handle(res)
  );
}

export function createTenderSubmission(
  tenderPackageId: string,
  data: Partial<TenderSubmissionInput>
): Promise<TenderSubmission> {
  return fetch(`${API_BASE}/tender-packages/${tenderPackageId}/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function updateTenderSubmission(
  id: string,
  data: Partial<TenderSubmissionInput>
): Promise<TenderSubmission> {
  return fetch(`${API_BASE}/tender-submissions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle(res));
}

export function deleteTenderSubmission(id: string): Promise<void> {
  return fetch(`${API_BASE}/tender-submissions/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function askProjectAi(projectId: string, question: string): Promise<{ answer: string }> {
  return fetch(`${API_BASE}/projects/${projectId}/ai/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  }).then((res) => handle(res));
}

export function askPortfolioAi(question: string): Promise<{ answer: string }> {
  return fetch(`${API_BASE}/ai/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  }).then((res) => handle(res));
}

export function searchAll(query: string): Promise<{ query: string; results: SearchResult[] }> {
  return fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`).then((res) => handle(res));
}
