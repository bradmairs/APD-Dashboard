import { lazy, ReactNode, Suspense, useEffect, useMemo, useRef, useState } from "react";
import FormattedText from "../components/FormattedText";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTabParam } from "../useTabParam";
import { batched } from "../batch";
import {
  ActionItem,
  ActionItemInput,
  ActivityLogEntry,
  ArchiveItemType,
  ArchiveLink,
  Attachment,
  CashFlowEntry,
  CashFlowEntryInput,
  ChecklistItem,
  ChecklistItemInput,
  CommunityEnquiry,
  CommunityEnquiryInput,
  Correspondence,
  CorrespondenceInput,
  PerformanceReview,
  PerformanceReviewInput,
  TrainingRecord,
  TrainingRecordInput,
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
  SafetyInspection,
  SafetyInspectionInput,
  InsuranceWarranty,
  InsuranceWarrantyInput,
  LessonLearned,
  LessonLearnedInput,
  MeetingMinutes,
  MeetingMinutesInput,
  MeetingMinutesDraft,
  PaymentClaim,
  PaymentClaimInput,
  Permit,
  PermitInput,
  Stakeholder,
  StakeholderInput,
  Milestone,
  MilestoneInput,
  MonthlyReport,
  Project,
  ProjectInput,
  Rfi,
  RfiInput,
  Risk,
  RiskInput,
  SiteVisit,
  SiteVisitInput,
  SiteVisitPhoto,
  SqeRecord,
  SqeRecordInput,
  Subcontractor,
  SubcontractorInput,
  ContractRecord,
  ContractRecordInput,
  SuggestedAction,
  Task,
  TaskInput,
  TaskRecurrence,
  TaskStatus,
  TenderPackage,
  TenderPackageInput,
  TenderSubmission,
  TenderSubmissionInput,
  ToolboxTalk,
  ToolboxTalkInput,
  Variation,
  VariationInput,
} from "../types";
import {
  createActionItem,
  createArchiveLink,
  createChecklistItem,
  createTenderSubmission,
  importMeetingActions,
  deleteTenderSubmission,
  getTenderSubmissions,
  updateTenderSubmission,
  createCommunityEnquiry,
  createCorrespondence,
  createDefect,
  createDocument,
  createEnvironmentalMonitoring,
  createDelay,
  createEotClaim,
  createSafetyInspection,
  createInsuranceWarranty,
  createLessonLearned,
  createMeetingMinutes,
  createMilestone,
  createPaymentClaim,
  createPermit,
  createRfi,
  createRisk,
  createSiteVisit,
  createSqeRecord,
  createStakeholder,
  createSubcontractor,
  createContract,
  applyTaskTemplate,
  createTask,
  createTenderPackage,
  createPerformanceReview,
  createToolboxTalk,
  createTrainingRecord,
  createVariation,
  deleteActionItem,
  deleteArchiveLink,
  deleteAttachment,
  deleteCashFlowEntry,
  deleteChecklistItem,
  deleteCommunityEnquiry,
  deleteCorrespondence,
  deleteDefect,
  deleteDocument,
  deleteEnvironmentalMonitoring,
  deleteDelay,
  deleteEotClaim,
  extractMeetingActions,
  generateMeetingMinutesDraft,
  deleteSafetyInspection,
  deleteInsuranceWarranty,
  deleteLessonLearned,
  deleteMeetingMinutes,
  deleteMilestone,
  deletePaymentClaim,
  deletePermit,
  deleteProject,
  deleteRfi,
  deleteRisk,
  deleteSiteVisit,
  deleteSiteVisitPhoto,
  syncSiteVisitPhotoToArchive,
  deleteSqeRecord,
  deleteStakeholder,
  deleteSubcontractor,
  deleteContract,
  deleteTask,
  deleteTenderPackage,
  deletePerformanceReview,
  deleteToolboxTalk,
  deleteTrainingRecord,
  deleteVariation,
  getActionItems,
  getArchiveLinks,
  getAttachments,
  getCashFlowEntries,
  getChecklistItems,
  getCommunityEnquiries,
  getCorrespondence,
  getDefects,
  getDocuments,
  getEnvironmentalMonitoring,
  getDelays,
  getEotClaims,
  getSafetyInspections,
  getInsuranceWarranties,
  getLessonsLearned,
  getMeetingMinutes,
  getMilestones,
  getMonthlyReports,
  getPaymentClaims,
  getPermits,
  getProject,
  getProjectActivity,
  getProjectSitePhotos,
  getRfis,
  getRisks,
  getSiteVisits,
  getSqeRecords,
  getStakeholders,
  getSubcontractors,
  getContracts,
  getTenderPackages,
  getPerformanceReviews,
  getToolboxTalks,
  getTrainingRecords,
  getVariations,
  reorderMilestone,
  updateActionItem,
  updateChecklistItem,
  updateCommunityEnquiry,
  updateCorrespondence,
  updateDefect,
  updateDocument,
  updateEnvironmentalMonitoring,
  updateDelay,
  updateEotClaim,
  updateSafetyInspection,
  updateInsuranceWarranty,
  updateLessonLearned,
  updateMeetingMinutes,
  updateMilestone,
  updatePaymentClaim,
  updatePermit,
  updateProject,
  updateRfi,
  updateRisk,
  updateSiteVisit,
  updateSqeRecord,
  updateStakeholder,
  updateSubcontractor,
  updateContract,
  updateTask,
  updateTenderPackage,
  updatePerformanceReview,
  updateToolboxTalk,
  updateTrainingRecord,
  updateVariation,
  uploadAttachment,
  uploadSiteVisitPhotos,
  upsertCashFlowEntry,
  updateCashFlowEntry,
} from "../api";
import ProjectFormModal from "../components/ProjectFormModal";
const TaskList = lazy(() => import("../components/TaskList"));
import ActivityFeed from "../components/ActivityFeed";
const AttachmentsPanel = lazy(() => import("../components/AttachmentsPanel"));
const ArchiveLinksPanel = lazy(() => import("../components/ArchiveLinksPanel"));
const MonthlyReportingPanel = lazy(() => import("../monthlyReport/MonthlyReportingPanel"));
const MilestonesPanel = lazy(() => import("../components/MilestonesPanel"));
const ProjectTimeline = lazy(() => import("../components/ProjectTimeline"));
import ApplyTaskTemplateControl from "../components/ApplyTaskTemplateControl";
const CashFlowPanel = lazy(() => import("../components/CashFlowPanel"));
const SiteVisitsPanel = lazy(() => import("../components/SiteVisitsPanel"));
const VariationsPanel = lazy(() => import("../components/VariationsPanel"));
const RisksPanel = lazy(() => import("../components/RisksPanel"));
const RfisPanel = lazy(() => import("../components/RfisPanel"));
const ActionsPanel = lazy(() => import("../components/ActionsPanel"));
const StakeholdersPanel = lazy(() => import("../components/StakeholdersPanel"));
const SubcontractorsPanel = lazy(() => import("../components/SubcontractorsPanel"));
const ContractsPanel = lazy(() => import("../components/ContractsPanel"));
const PermitsPanel = lazy(() => import("../components/PermitsPanel"));
const InsuranceWarrantiesPanel = lazy(() => import("../components/InsuranceWarrantiesPanel"));
const LessonsLearnedPanel = lazy(() => import("../components/LessonsLearnedPanel"));
const MeetingMinutesPanel = lazy(() => import("../components/MeetingMinutesPanel"));
const SqePanel = lazy(() => import("../components/SqePanel"));
const EnvironmentalMonitoringPanel = lazy(() => import("../components/EnvironmentalMonitoringPanel"));
const SafetyInspectionsPanel = lazy(() => import("../components/SafetyInspectionsPanel"));
const TenderPackagesPanel = lazy(() => import("../components/TenderPackagesPanel"));
const DelaysPanel = lazy(() => import("../components/DelaysPanel"));
const EotPanel = lazy(() => import("../components/EotPanel"));
const ChecklistPanel = lazy(() => import("../components/ChecklistPanel"));
const TenderSubmissionsPanel = lazy(() => import("../components/TenderSubmissionsPanel"));
import CollapsibleSection, {
  COLLAPSE_THRESHOLD,
  useExpandedSections,
} from "../components/CollapsibleSection";
import { STANDARD_PROCUREMENT_CHECKLIST } from "../checklistMeta";
const DefectsPanel = lazy(() => import("../components/DefectsPanel"));
const DocumentsPanel = lazy(() => import("../components/DocumentsPanel"));
const EnquiriesPanel = lazy(() => import("../components/EnquiriesPanel"));
const CorrespondencePanel = lazy(() => import("../components/CorrespondencePanel"));
const TrainingRecordsPanel = lazy(() => import("../components/TrainingRecordsPanel"));
const PerformanceReviewsPanel = lazy(() => import("../components/PerformanceReviewsPanel"));
const ToolboxTalksPanel = lazy(() => import("../components/ToolboxTalksPanel"));
import Tabs from "../components/Tabs";
const PaymentClaimsPanel = lazy(() => import("../components/PaymentClaimsPanel"));
import HealthBadge from "../components/HealthBadge";
import { computeProjectHealth } from "../health";
import { revisedCompletionDate } from "../eot";
import { STATUS_COLORS, STATUS_LABELS } from "../statusMeta";
import { formatCurrency, formatDate, formatReportMonth } from "../format";
import { trimHref, useTrimRecordUrl } from "../trim";
import { canModifyProject } from "../permissions";
import AppLayout from "../components/AppLayout";
import { ChangeHistoryButton } from "../history/ChangeHistory";
import { Icon } from "../components/icons";
import ProjectProgressStrip from "../components/ProjectProgressStrip";
import CostForecastCard from "../components/CostForecastCard";
import RiskHeatMap from "../components/RiskHeatMap";
import ProjectOpenItems from "../components/ProjectOpenItems";
import { onDataChanged, openQuickAdd } from "../components/QuickAdd";
import { SkeletonCard, SkeletonSections } from "../components/Skeleton";
import {
  forgetRecentProject,
  loadHideEmpty,
  loadLastProjectTab,
  saveHideEmpty,
  rememberRecentProject,
  saveLastProjectTab,
} from "../layout/navMemory";
import ProjectSectionMenu from "../components/ProjectSectionMenu";
import { useAuth } from "../auth/AuthContext";
import SectionJumpNav, { JumpSection } from "../components/SectionJumpNav";
import { useUndoToast } from "../undo/UndoToastContext";
import { useConfirm } from "../confirm/ConfirmContext";

type ProjectTabId =
  | "overview"
  | "schedule"
  | "budget"
  | "procurement"
  | "quality"
  | "site"
  | "monthly-reporting";

const PROJECT_TABS: { id: ProjectTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "schedule", label: "Schedule" },
  { id: "budget", label: "Budget & Contract" },
  { id: "procurement", label: "Procurement" },
  { id: "quality", label: "Quality & Risk" },
  { id: "site", label: "Site & Records" },
  { id: "monthly-reporting", label: "Monthly Reporting" },
];

// One entry per panel rendered in that tab below — same order top to bottom,
// each id matching the wrapper <div> around that panel's JSX. Kept as a flat
// list per tab (rather than deriving it from the JSX) since the panels
// themselves don't know their own display order or which tab they're in.
const TAB_SECTIONS: Record<ProjectTabId, JumpSection[]> = {
  overview: [
    { id: "stakeholders", label: "Stakeholders" },
    { id: "actions", label: "Actions & Decisions" },
    { id: "meeting-minutes", label: "Meeting Minutes" },
    { id: "activity", label: "Activity" },
  ],
  schedule: [
    { id: "timeline", label: "Timeline" },
    { id: "milestones", label: "Milestones" },
    { id: "tasks", label: "Tasks" },
    { id: "delays", label: "Delays" },
    { id: "eot-claims", label: "Extension of Time" },
    { id: "checklist", label: "Commissioning & Handover" },
  ],
  budget: [
    { id: "contracts", label: "Contracts" },
    { id: "cash-flow", label: "Cash Flow" },
    { id: "variations", label: "Variations" },
    { id: "payment-claims", label: "Payment Claims" },
    { id: "insurance-warranties", label: "Insurance & Warranties" },
    { id: "permits", label: "Permits & Approvals" },
    { id: "subcontractors", label: "Subcontractors" },
    { id: "performance-reviews", label: "Performance Reviews" },
  ],
  procurement: [
    { id: "tender-packages", label: "Tenders" },
    { id: "tender-submissions", label: "Tender Submissions & Assessment" },
    { id: "procurement-checklist", label: "Procurement Checklist" },
  ],
  quality: [
    { id: "risks", label: "Risk Register" },
    { id: "sqe", label: "Safety/Quality/Environment" },
    { id: "environmental-monitoring", label: "Environmental Monitoring" },
    { id: "safety-inspections", label: "Safety Inspections" },
    { id: "defects", label: "Defects & Punch List" },
    { id: "rfis", label: "RFIs" },
    { id: "documents", label: "Document Register" },
    { id: "correspondence", label: "Correspondence" },
  ],
  site: [
    { id: "site-visits", label: "Site Visits" },
    { id: "enquiries", label: "Community Enquiries" },
    { id: "attachments", label: "Attachments" },
    { id: "archive-links", label: "Archive Links" },
    { id: "lessons-learned", label: "Lessons Learned" },
    { id: "training-records", label: "Training Records" },
    { id: "toolbox-talks", label: "Toolbox Talks" },
  ],
  "monthly-reporting": [],
};

// On very wide screens sections sit two across; these wide ones (timelines,
// big tables) keep the full width.
const WIDE_SECTION = "min-[1800px]:col-span-2";
const WIDE_SECTIONS = new Set([
  "timeline",
  "tasks",
  "meeting-minutes",
  "contracts",
  "cash-flow",
  "payment-claims",
  "tender-submissions",
  "site-visits",
  "risks",
]);

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isViewer } = useAuth();
  const { notifyUndo } = useUndoToast();
  const [project, setProject] = useState<Project | null>(null);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [archiveLinks, setArchiveLinks] = useState<ArchiveLink[]>([]);
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [cashFlowEntries, setCashFlowEntries] = useState<CashFlowEntry[]>([]);
  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>([]);
  const [sitePhotos, setSitePhotos] = useState<SiteVisitPhoto[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [permits, setPermits] = useState<Permit[]>([]);
  const [insuranceWarranties, setInsuranceWarranties] = useState<InsuranceWarranty[]>([]);
  const [rfis, setRfis] = useState<Rfi[]>([]);
  const [lessons, setLessons] = useState<LessonLearned[]>([]);
  const [sqeRecords, setSqeRecords] = useState<SqeRecord[]>([]);
  const [delays, setDelays] = useState<Delay[]>([]);
  const [eotClaims, setEotClaims] = useState<EotClaim[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [defects, setDefects] = useState<DefectItem[]>([]);
  const [paymentClaims, setPaymentClaims] = useState<PaymentClaim[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [communityEnquiries, setCommunityEnquiries] = useState<CommunityEnquiry[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [meetingMinutes, setMeetingMinutes] = useState<MeetingMinutes[]>([]);
  const [correspondence, setCorrespondence] = useState<Correspondence[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([]);
  const [performanceReviews, setPerformanceReviews] = useState<PerformanceReview[]>([]);
  const [toolboxTalks, setToolboxTalks] = useState<ToolboxTalk[]>([]);
  const [environmentalMonitoring, setEnvironmentalMonitoring] = useState<
    EnvironmentalMonitoringRecord[]
  >([]);
  const [safetyInspections, setSafetyInspections] = useState<SafetyInspection[]>([]);
  const [tenderPackages, setTenderPackages] = useState<TenderPackage[]>([]);
  const [tenderSubmissions, setTenderSubmissions] = useState<TenderSubmission[]>([]);
  const { expanded: expandedSections, setExpanded: setSectionsExpanded } =
    useExpandedSections();
  const trimRecordUrl = useTrimRecordUrl();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useTabParam(PROJECT_TABS, "overview");
  const [searchParams] = useSearchParams();

  // "Hide empty sections" on this project (remembered per user, per project).
  const [hideEmpty, setHideEmpty] = useState(false);
  useEffect(() => {
    setHideEmpty(!!id && !!user && loadHideEmpty(user.id, id));
  }, [id, user]);
  function toggleHideEmpty() {
    if (!id || !user) return;
    saveHideEmpty(user.id, id, !hideEmpty);
    setHideEmpty(!hideEmpty);
  }

  // Back on a project with no ?tab in the link: reopen the group you were
  // last on for this project (remembered per user, in this browser).
  const restoredTabForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!id || !user || restoredTabForRef.current === id) return;
    restoredTabForRef.current = id;
    if (searchParams.get("tab")) return;
    const last = loadLastProjectTab(user.id, id);
    if (last && last !== "overview" && PROJECT_TABS.some((t) => t.id === last)) {
      setActiveTab(last as ProjectTabId);
    }
    // Only when arriving on a project.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);
  useEffect(() => {
    if (id && user && restoredTabForRef.current === id) saveLastProjectTab(user.id, id, activeTab);
  }, [id, user, activeTab]);

  // Which project's data is currently on screen, and which load is the
  // latest — see load() below.
  const loadedIdRef = useRef<string | null>(null);
  const loadSeqRef = useRef(0);

  // Every save/edit/delete handler on this page ends with `await load()`.
  // Only the FIRST load of a project (or a switch to another) shows the
  // full-page "Loading…" screen; every later call is a background refresh
  // that swaps the new data in place. Showing "Loading…" each time unmounted
  // the whole page — snapping the scroll position back to the top and wiping
  // any in-progress state in the panels — after every single change.
  async function load() {
    if (!id) return;
    const seq = ++loadSeqRef.current;
    const initial = loadedIdRef.current !== id;
    if (initial) setLoading(true);
    setError(null);
    let refreshAfter = false;
    try {
      const [
        data,
        activityData,
        attachmentData,
        archiveLinkData,
        reportData,
        milestoneData,
        cashFlowData,
        siteVisitData,
        sitePhotoData,
        variationData,
        riskData,
        actionItemData,
        stakeholderData,
        permitData,
        lessonData,
        sqeData,
        eotData,
        checklistData,
        defectData,
        paymentClaimData,
        insuranceWarrantyData,
        rfiData,
        documentData,
        communityEnquiryData,
        subcontractorData,
        contractData,
        meetingMinutesData,
        correspondenceData,
        trainingRecordData,
        performanceReviewData,
        toolboxTalkData,
        environmentalMonitoringData,
        safetyInspectionData,
        tenderPackageData,
        delayData,
        tenderSubmissionData,
      ] = await batched(() => Promise.all([
        getProject(id),
        getProjectActivity(id),
        getAttachments(id),
        getArchiveLinks(id),
        getMonthlyReports(id),
        getMilestones(id),
        getCashFlowEntries(id),
        getSiteVisits(id),
        getProjectSitePhotos(id),
        getVariations(id),
        getRisks(id),
        getActionItems(id),
        getStakeholders(id),
        getPermits(id),
        getLessonsLearned(id),
        getSqeRecords(id),
        getEotClaims(id),
        getChecklistItems(id),
        getDefects(id),
        getPaymentClaims(id),
        getInsuranceWarranties(id),
        getRfis(id),
        getDocuments(id),
        getCommunityEnquiries(id),
        getSubcontractors(id),
        getContracts(id),
        getMeetingMinutes(id),
        getCorrespondence(id),
        getTrainingRecords(id),
        getPerformanceReviews(id),
        getToolboxTalks(id),
        getEnvironmentalMonitoring(id),
        getSafetyInspections(id),
        getTenderPackages(id),
        getDelays(id),
        getTenderSubmissions(id),
      ]), { preferCache: initial, onCacheHit: () => (refreshAfter = true) });
      // Two quick saves overlap two refreshes — only the newest one's
      // result is applied, so an older response can't overwrite it.
      if (seq !== loadSeqRef.current) return;
      setProject(data);
      setActivity(activityData);
      setAttachments(attachmentData);
      setArchiveLinks(archiveLinkData);
      setReports(reportData);
      setMilestones(milestoneData);
      setCashFlowEntries(cashFlowData);
      setSiteVisits(siteVisitData);
      setSitePhotos(sitePhotoData);
      setVariations(variationData);
      setRisks(riskData);
      setActionItems(actionItemData);
      setStakeholders(stakeholderData);
      setPermits(permitData);
      setLessons(lessonData);
      setSqeRecords(sqeData);
      setDelays(delayData);
      setEotClaims(eotData);
      setChecklistItems(checklistData);
      setDefects(defectData);
      setPaymentClaims(paymentClaimData);
      setInsuranceWarranties(insuranceWarrantyData);
      setRfis(rfiData);
      setDocuments(documentData);
      setCommunityEnquiries(communityEnquiryData);
      setSubcontractors(subcontractorData);
      setContracts(contractData);
      setMeetingMinutes(meetingMinutesData);
      setCorrespondence(correspondenceData);
      setTrainingRecords(trainingRecordData);
      setPerformanceReviews(performanceReviewData);
      setToolboxTalks(toolboxTalkData);
      setEnvironmentalMonitoring(environmentalMonitoringData);
      setSafetyInspections(safetyInspectionData);
      setTenderPackages(tenderPackageData);
      setTenderSubmissions(tenderSubmissionData);
      loadedIdRef.current = id;
    } catch (err) {
      if (seq !== loadSeqRef.current) return;
      if (initial) {
        setError(err instanceof Error ? err.message : "Failed to load project");
      } else {
        // A failed background refresh keeps the (slightly stale) page rather
        // than replacing it with an error screen; the next action will
        // surface a real connectivity problem itself.
        console.error("Background refresh failed", err);
      }
    } finally {
      if (seq === loadSeqRef.current && initial) setLoading(false);
    }
    // Drawn from the last visit's data: now fetch the latest quietly.
    if (refreshAfter && seq === loadSeqRef.current) load();
  }

  useEffect(() => {
    load();
    // Added to this project from the top bar's "+ New": refresh quietly.
    const stop = onDataChanged((projectId) => {
      if (!projectId || projectId === id) load();
    });
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave(data: Partial<ProjectInput>) {
    if (!project) return;
    await updateProject(project.id, data);
    setShowModal(false);
    await load();
  }

  const confirm = useConfirm();

  async function handleDeleteProject() {
    if (!project) return;
    if (!await confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    await deleteProject(project.id);
    if (user) forgetRecentProject(user.id, project.id);
    navigate("/");
  }

  async function handleAddTask(
    title: string,
    dueDate: string | null,
    recurrence: TaskRecurrence
  ) {
    if (!project) return;
    await createTask(project.id, { title, dueDate, status: "TODO", recurrence });
    await load();
  }

  async function handleCreateMeetingTask(data: Partial<TaskInput>) {
    if (!project) return;
    await createTask(project.id, data);
    await load();
  }

  async function handleUpdateTask(task: Task, changes: Partial<TaskInput>) {
    await updateTask(task.id, changes);
    await load();
  }

  async function handleDeleteTask(task: Task) {
    await deleteTask(task.id);
    await load();
    notifyUndo(`Task "${task.title}" deleted.`, async () => {
      await createTask(project!.id, task);
      await load();
    });
  }

  async function handleApplyTaskTemplate(templateId: string) {
    if (!project) return;
    await applyTaskTemplate(templateId, project.id);
    await load();
  }

  async function handleUploadAttachment(file: File) {
    if (!project) return;
    await uploadAttachment(project.id, file);
    await load();
  }

  async function handleDeleteAttachment(attachment: Attachment) {
    if (!await confirm(`Delete "${attachment.originalName}"? This cannot be undone.`)) return;
    await deleteAttachment(attachment.id);
    await load();
  }

  async function handleCreateArchiveLink(data: {
    archiveType: ArchiveItemType;
    archiveId: string;
    label: string;
  }) {
    if (!project) return;
    await createArchiveLink(project.id, data);
    await load();
  }

  async function handleDeleteArchiveLink(link: ArchiveLink) {
    if (!await confirm(`Remove the link to "${link.label}"? This only removes the link, not the item itself in the Archive.`, { confirmLabel: "Remove" })) return;
    await deleteArchiveLink(link.id);
    await load();
    notifyUndo(`Archive link "${link.label}" removed.`, () =>
      handleCreateArchiveLink({
        archiveType: link.archiveType,
        archiveId: link.archiveId,
        label: link.label,
      })
    );
  }

  async function handleSyncPhotoToArchive(photoId: string) {
    await syncSiteVisitPhotoToArchive(photoId);
    await load();
  }

  async function handleCreateMilestone(data: Partial<MilestoneInput>) {
    if (!project) return;
    await createMilestone(project.id, data);
    await load();
  }

  async function handleUpdateMilestone(
    milestone: Milestone,
    data: Partial<MilestoneInput>
  ) {
    await updateMilestone(milestone.id, data);
    await load();
  }

  async function handleDeleteMilestone(milestone: Milestone) {
    await deleteMilestone(milestone.id);
    await load();
    notifyUndo(`Milestone "${milestone.taskActivity}" deleted.`, () =>
      handleCreateMilestone(milestone)
    );
  }

  async function handleReorderMilestone(
    milestone: Milestone,
    direction: "up" | "down"
  ) {
    await reorderMilestone(milestone.id, direction);
    await load();
  }

  // A cash flow change can only affect its own rows (and, through them, the
  // project's health badges and charts, which are derived from state here)
  // plus the activity feed — so refresh just those two rather than the ~30
  // requests a full load() makes. Cash flow is the most frequent edit on this
  // page (a forecast or actual per month), which is why it gets this.
  async function refreshCashFlow() {
    if (!id) return;
    const [entries, activityData] = await Promise.all([
      getCashFlowEntries(id),
      getProjectActivity(id),
    ]);
    setCashFlowEntries(entries);
    setActivity(activityData);
  }

  async function handleUpsertCashFlowEntry(data: Partial<CashFlowEntryInput>) {
    if (!project) return;
    await upsertCashFlowEntry(project.id, data);
    await refreshCashFlow();
  }

  async function handleUpdateCashFlowEntry(
    entry: CashFlowEntry,
    data: Partial<CashFlowEntryInput>
  ) {
    // A different target type that already exists for the month is merged into
    // by the server (it takes the new amount and this entry goes away), so
    // remember it to put back on undo.
    const replaced =
      data.type && data.type !== entry.type
        ? cashFlowEntries.find(
            (other) =>
              other.id !== entry.id &&
              other.type === data.type &&
              other.month.substring(0, 7) === entry.month.substring(0, 7)
          )
        : undefined;
    await updateCashFlowEntry(entry.id, data);
    await refreshCashFlow();
    const label = formatReportMonth(entry.month);
    notifyUndo(
      data.type && data.type !== entry.type
        ? `${label} changed from ${entry.type.toLowerCase()} to ${data.type.toLowerCase()}.`
        : `${label} ${entry.type.toLowerCase()} entry updated.`,
      async () => {
        if (replaced) {
          // Merged: the server kept the existing entry (with the new amount)
          // and removed this one, so restore the old amount and recreate it.
          await updateCashFlowEntry(replaced.id, { amount: replaced.amount });
          await upsertCashFlowEntry(entry.projectId, {
            month: entry.month,
            type: entry.type,
            amount: entry.amount,
          });
        } else {
          await updateCashFlowEntry(entry.id, { type: entry.type, amount: entry.amount });
        }
        await refreshCashFlow();
      }
    );
  }

  async function handleDeleteCashFlowEntry(entry: CashFlowEntry) {
    await deleteCashFlowEntry(entry.id);
    await refreshCashFlow();
    notifyUndo(
      `${formatReportMonth(entry.month)} ${entry.type.toLowerCase()} entry deleted.`,
      () => handleUpsertCashFlowEntry(entry)
    );
  }

  async function handleCreateSiteVisit(data: Partial<SiteVisitInput>) {
    if (!project) return null;
    const siteVisit = await createSiteVisit(project.id, data);
    await load();
    return siteVisit;
  }

  async function handleUpdateSiteVisit(
    siteVisit: SiteVisit,
    data: Partial<SiteVisitInput>
  ) {
    await updateSiteVisit(siteVisit.id, data);
    await load();
  }

  async function handleDeleteSiteVisit(siteVisit: SiteVisit) {
    await deleteSiteVisit(siteVisit.id);
    await load();
    notifyUndo(`Site visit at "${siteVisit.location}" deleted.`, async () => {
      await handleCreateSiteVisit(siteVisit);
    });
  }

  async function handleUploadSiteVisitPhotos(siteVisit: SiteVisit, files: File[]) {
    await uploadSiteVisitPhotos(siteVisit.id, files);
    await load();
  }

  async function handleDeleteSiteVisitPhoto(photo: SiteVisitPhoto) {
    await deleteSiteVisitPhoto(photo.id);
    await load();
  }

  async function handleCreateVariation(data: Partial<VariationInput>) {
    if (!project) return;
    await createVariation(project.id, data);
    await load();
  }

  async function handleUpdateVariation(
    variation: Variation,
    data: Partial<VariationInput>
  ) {
    await updateVariation(variation.id, data);
    await load();
  }

  async function handleDeleteVariation(variation: Variation) {
    await deleteVariation(variation.id);
    await load();
    notifyUndo(`Variation "${variation.title}" deleted.`, () =>
      handleCreateVariation(variation)
    );
  }

  async function handleCreateRisk(data: Partial<RiskInput>) {
    if (!project) return;
    await createRisk(project.id, data);
    await load();
  }

  async function handleUpdateRisk(risk: Risk, data: Partial<RiskInput>) {
    await updateRisk(risk.id, data);
    await load();
  }

  async function handleDeleteRisk(risk: Risk) {
    await deleteRisk(risk.id);
    await load();
    notifyUndo(`Risk "${risk.title}" deleted.`, () => handleCreateRisk(risk));
  }

  async function handleCreateActionItem(data: Partial<ActionItemInput>) {
    if (!project) return;
    await createActionItem(project.id, data);
    await load();
  }

  async function handleUpdateActionItem(
    actionItem: ActionItem,
    data: Partial<ActionItemInput>
  ) {
    await updateActionItem(actionItem.id, data);
    await load();
  }

  async function handleDeleteActionItem(actionItem: ActionItem) {
    await deleteActionItem(actionItem.id);
    await load();
    notifyUndo(`"${actionItem.title}" deleted.`, () => handleCreateActionItem(actionItem));
  }

  async function handleCreateStakeholder(data: Partial<StakeholderInput>) {
    if (!project) return;
    await createStakeholder(project.id, data);
    await load();
  }

  async function handleUpdateStakeholder(
    stakeholder: Stakeholder,
    data: Partial<StakeholderInput>
  ) {
    await updateStakeholder(stakeholder.id, data);
    await load();
  }

  async function handleDeleteStakeholder(stakeholder: Stakeholder) {
    await deleteStakeholder(stakeholder.id);
    await load();
    notifyUndo(`Stakeholder "${stakeholder.name}" deleted.`, () =>
      handleCreateStakeholder(stakeholder)
    );
  }

  async function handleCreatePermit(data: Partial<PermitInput>) {
    if (!project) return;
    await createPermit(project.id, data);
    await load();
  }

  async function handleUpdatePermit(permit: Permit, data: Partial<PermitInput>) {
    await updatePermit(permit.id, data);
    await load();
  }

  async function handleDeletePermit(permit: Permit) {
    await deletePermit(permit.id);
    await load();
    notifyUndo(`Permit "${permit.title}" deleted.`, () => handleCreatePermit(permit));
  }

  async function handleCreateLesson(data: Partial<LessonLearnedInput>) {
    if (!project) return;
    await createLessonLearned(project.id, data);
    await load();
  }

  async function handleUpdateLesson(
    lesson: LessonLearned,
    data: Partial<LessonLearnedInput>
  ) {
    await updateLessonLearned(lesson.id, data);
    await load();
  }

  async function handleDeleteLesson(lesson: LessonLearned) {
    await deleteLessonLearned(lesson.id);
    await load();
    notifyUndo(`Lesson "${lesson.title}" deleted.`, () => handleCreateLesson(lesson));
  }

  async function handleCreateSqeRecord(data: Partial<SqeRecordInput>) {
    if (!project) return;
    await createSqeRecord(project.id, data);
    await load();
  }

  async function handleUpdateSqeRecord(
    record: SqeRecord,
    data: Partial<SqeRecordInput>
  ) {
    await updateSqeRecord(record.id, data);
    await load();
  }

  async function handleDeleteSqeRecord(record: SqeRecord) {
    await deleteSqeRecord(record.id);
    await load();
    notifyUndo(`SQE record "${record.title}" deleted.`, () => handleCreateSqeRecord(record));
  }

  async function handleCreateEnvironmentalMonitoring(
    data: Partial<EnvironmentalMonitoringRecordInput>
  ) {
    if (!project) return;
    await createEnvironmentalMonitoring(project.id, data);
    await load();
  }

  async function handleUpdateEnvironmentalMonitoring(
    record: EnvironmentalMonitoringRecord,
    data: Partial<EnvironmentalMonitoringRecordInput>
  ) {
    await updateEnvironmentalMonitoring(record.id, data);
    await load();
  }

  async function handleDeleteEnvironmentalMonitoring(record: EnvironmentalMonitoringRecord) {
    await deleteEnvironmentalMonitoring(record.id);
    await load();
    notifyUndo(`"${record.parameter}" reading deleted.`, () =>
      handleCreateEnvironmentalMonitoring(record)
    );
  }

  async function handleCreateSafetyInspection(data: Partial<SafetyInspectionInput>) {
    if (!project) return;
    await createSafetyInspection(project.id, data);
    await load();
  }

  async function handleUpdateSafetyInspection(
    inspection: SafetyInspection,
    data: Partial<SafetyInspectionInput>
  ) {
    await updateSafetyInspection(inspection.id, data);
    await load();
  }

  async function handleDeleteSafetyInspection(inspection: SafetyInspection) {
    await deleteSafetyInspection(inspection.id);
    await load();
    notifyUndo(`"${inspection.inspectionType}" inspection deleted.`, () =>
      handleCreateSafetyInspection(inspection)
    );
  }

  async function handleCreateTenderPackage(data: Partial<TenderPackageInput>) {
    if (!project) return;
    await createTenderPackage(project.id, data);
    await load();
  }

  async function handleUpdateTenderPackage(
    tenderPackage: TenderPackage,
    data: Partial<TenderPackageInput>
  ) {
    await updateTenderPackage(tenderPackage.id, data);
    await load();
  }

  async function handleDeleteTenderPackage(tenderPackage: TenderPackage) {
    await deleteTenderPackage(tenderPackage.id);
    await load();
    notifyUndo(`Tender package "${tenderPackage.title}" deleted.`, () =>
      handleCreateTenderPackage(tenderPackage)
    );
  }

  async function handleCreateDelay(data: Partial<DelayInput>) {
    if (!project) return;
    await createDelay(project.id, data);
    await load();
  }

  async function handleUpdateDelay(delay: Delay, data: Partial<DelayInput>) {
    await updateDelay(delay.id, data);
    await load();
  }

  async function handleDeleteDelay(delay: Delay) {
    await deleteDelay(delay.id);
    await load();
    notifyUndo(`Delay "${delay.title}" deleted.`, () => handleCreateDelay(delay));
  }

  async function handleCreateEotClaim(data: Partial<EotClaimInput>) {
    if (!project) return;
    await createEotClaim(project.id, data);
    await load();
  }

  async function handleUpdateEotClaim(claim: EotClaim, data: Partial<EotClaimInput>) {
    await updateEotClaim(claim.id, data);
    await load();
  }

  async function handleDeleteEotClaim(claim: EotClaim) {
    await deleteEotClaim(claim.id);
    await load();
    notifyUndo(`EOT claim "${claim.title}" deleted.`, () => handleCreateEotClaim(claim));
  }

  async function handleCreateChecklistItem(data: Partial<ChecklistItemInput>) {
    if (!project) return;
    await createChecklistItem(project.id, data);
    await load();
  }

  async function handleCreateChecklistItems(items: Partial<ChecklistItemInput>[]) {
    if (!project) return;
    try {
      // In order, so the checklist reads top to bottom as listed.
      for (const data of items) await createChecklistItem(project.id, data);
    } finally {
      await load();
    }
  }

  async function handleCreateTenderSubmission(
    tenderPackage: TenderPackage,
    data: Partial<TenderSubmissionInput>
  ) {
    await createTenderSubmission(tenderPackage.id, data);
    await load();
  }

  async function handleUpdateTenderSubmission(
    submission: TenderSubmission,
    data: Partial<TenderSubmissionInput>
  ) {
    await updateTenderSubmission(submission.id, data);
    await load();
  }

  async function handleDeleteTenderSubmission(submission: TenderSubmission) {
    await deleteTenderSubmission(submission.id);
    await load();
    const tenderPackage = tenderPackages.find((p) => p.id === submission.tenderPackageId);
    notifyUndo(`Submission from ${submission.tendererName} deleted.`, async () => {
      if (!tenderPackage) return;
      await handleCreateTenderSubmission(tenderPackage, {
        tendererName: submission.tendererName,
        dateReceived: submission.dateReceived,
        tenderPrice: submission.tenderPrice,
        conforming: submission.conforming,
        score: submission.score,
        rank: submission.rank === null ? null : String(submission.rank),
        recommended: submission.recommended,
        notes: submission.notes,
      });
    });
  }

  async function handleUpdateChecklistItem(item: ChecklistItem, data: Partial<ChecklistItemInput>) {
    await updateChecklistItem(item.id, data);
    await load();
  }

  async function handleDeleteChecklistItem(item: ChecklistItem) {
    await deleteChecklistItem(item.id);
    await load();
    notifyUndo(`Checklist item "${item.title}" deleted.`, () =>
      handleCreateChecklistItem(item)
    );
  }

  async function handleCreateDefect(data: Partial<DefectItemInput>) {
    if (!project) return;
    await createDefect(project.id, data);
    await load();
  }

  async function handleUpdateDefect(defect: DefectItem, data: Partial<DefectItemInput>) {
    await updateDefect(defect.id, data);
    await load();
  }

  async function handleDeleteDefect(defect: DefectItem) {
    await deleteDefect(defect.id);
    await load();
    notifyUndo(`Defect "${defect.title}" deleted.`, () => handleCreateDefect(defect));
  }

  async function handleCreatePaymentClaim(data: Partial<PaymentClaimInput>) {
    if (!project) return;
    await createPaymentClaim(project.id, data);
    await load();
  }

  async function handleUpdatePaymentClaim(
    claim: PaymentClaim,
    data: Partial<PaymentClaimInput>
  ) {
    await updatePaymentClaim(claim.id, data);
    await load();
  }

  async function handleDeletePaymentClaim(claim: PaymentClaim) {
    await deletePaymentClaim(claim.id);
    await load();
    notifyUndo(`Payment claim "${claim.claimNumber}" deleted.`, () =>
      handleCreatePaymentClaim(claim)
    );
  }

  async function handleCreateInsuranceWarranty(data: Partial<InsuranceWarrantyInput>) {
    if (!project) return;
    await createInsuranceWarranty(project.id, data);
    await load();
  }

  async function handleUpdateInsuranceWarranty(
    item: InsuranceWarranty,
    data: Partial<InsuranceWarrantyInput>
  ) {
    await updateInsuranceWarranty(item.id, data);
    await load();
  }

  async function handleDeleteInsuranceWarranty(item: InsuranceWarranty) {
    await deleteInsuranceWarranty(item.id);
    await load();
    notifyUndo(`"${item.title}" deleted.`, () => handleCreateInsuranceWarranty(item));
  }

  async function handleCreateRfi(data: Partial<RfiInput>) {
    if (!project) return;
    await createRfi(project.id, data);
    await load();
  }

  async function handleUpdateRfi(rfi: Rfi, data: Partial<RfiInput>) {
    await updateRfi(rfi.id, data);
    await load();
  }

  async function handleDeleteRfi(rfi: Rfi) {
    await deleteRfi(rfi.id);
    await load();
    notifyUndo(`RFI "${rfi.subject}" deleted.`, () => handleCreateRfi(rfi));
  }

  async function handleCreateCorrespondence(data: Partial<CorrespondenceInput>) {
    if (!project) return;
    await createCorrespondence(project.id, data);
    await load();
  }

  async function handleUpdateCorrespondence(
    item: Correspondence,
    data: Partial<CorrespondenceInput>
  ) {
    await updateCorrespondence(item.id, data);
    await load();
  }

  async function handleDeleteCorrespondence(item: Correspondence) {
    await deleteCorrespondence(item.id);
    await load();
    notifyUndo(`Correspondence "${item.subject}" deleted.`, () =>
      handleCreateCorrespondence(item)
    );
  }

  async function handleCreateTrainingRecord(data: Partial<TrainingRecordInput>) {
    if (!project) return;
    await createTrainingRecord(project.id, data);
    await load();
  }

  async function handleUpdateTrainingRecord(
    item: TrainingRecord,
    data: Partial<TrainingRecordInput>
  ) {
    await updateTrainingRecord(item.id, data);
    await load();
  }

  async function handleDeleteTrainingRecord(item: TrainingRecord) {
    await deleteTrainingRecord(item.id);
    await load();
    notifyUndo(`Training record for "${item.personName}" deleted.`, () =>
      handleCreateTrainingRecord(item)
    );
  }

  async function handleCreatePerformanceReview(data: Partial<PerformanceReviewInput>) {
    if (!project) return;
    await createPerformanceReview(project.id, data);
    await load();
  }

  async function handleUpdatePerformanceReview(
    item: PerformanceReview,
    data: Partial<PerformanceReviewInput>
  ) {
    await updatePerformanceReview(item.id, data);
    await load();
  }

  async function handleDeletePerformanceReview(item: PerformanceReview) {
    await deletePerformanceReview(item.id);
    await load();
    notifyUndo(`Performance review for "${item.revieweeName}" deleted.`, () =>
      handleCreatePerformanceReview(item)
    );
  }

  async function handleCreateToolboxTalk(data: Partial<ToolboxTalkInput>) {
    if (!project) return;
    await createToolboxTalk(project.id, data);
    await load();
  }

  async function handleUpdateToolboxTalk(item: ToolboxTalk, data: Partial<ToolboxTalkInput>) {
    await updateToolboxTalk(item.id, data);
    await load();
  }

  async function handleDeleteToolboxTalk(item: ToolboxTalk) {
    await deleteToolboxTalk(item.id);
    await load();
    notifyUndo(`Toolbox talk "${item.topic}" deleted.`, () => handleCreateToolboxTalk(item));
  }

  async function handleCreateDocument(data: Partial<DocumentRecordInput>) {
    if (!project) return;
    await createDocument(project.id, data);
    await load();
  }

  async function handleUpdateDocument(
    document: DocumentRecord,
    data: Partial<DocumentRecordInput>
  ) {
    await updateDocument(document.id, data);
    await load();
  }

  async function handleDeleteDocument(document: DocumentRecord) {
    await deleteDocument(document.id);
    await load();
    notifyUndo(`Document "${document.title}" deleted.`, () => handleCreateDocument(document));
  }

  async function handleCreateCommunityEnquiry(data: Partial<CommunityEnquiryInput>) {
    if (!project) return;
    await createCommunityEnquiry(project.id, data);
    await load();
  }

  async function handleUpdateCommunityEnquiry(
    enquiry: CommunityEnquiry,
    data: Partial<CommunityEnquiryInput>
  ) {
    await updateCommunityEnquiry(enquiry.id, data);
    await load();
  }

  async function handleDeleteCommunityEnquiry(enquiry: CommunityEnquiry) {
    await deleteCommunityEnquiry(enquiry.id);
    await load();
    notifyUndo(`Community enquiry "${enquiry.reference ?? enquiry.description}" deleted.`, () =>
      handleCreateCommunityEnquiry(enquiry)
    );
  }

  async function handleCreateSubcontractor(data: Partial<SubcontractorInput>) {
    if (!project) return;
    await createSubcontractor(project.id, data);
    await load();
  }

  async function handleUpdateSubcontractor(
    subcontractor: Subcontractor,
    data: Partial<SubcontractorInput>
  ) {
    await updateSubcontractor(subcontractor.id, data);
    await load();
  }

  async function handleDeleteSubcontractor(subcontractor: Subcontractor) {
    await deleteSubcontractor(subcontractor.id);
    await load();
    notifyUndo(`Subcontractor "${subcontractor.companyName}" deleted.`, () =>
      handleCreateSubcontractor(subcontractor)
    );
  }

  async function handleCreateContract(data: Partial<ContractRecordInput>) {
    if (!project) return;
    await createContract(project.id, data);
    await load();
  }

  async function handleUpdateContract(
    contract: ContractRecord,
    data: Partial<ContractRecordInput>
  ) {
    await updateContract(contract.id, data);
    await load();
  }

  async function handleDeleteContract(contract: ContractRecord) {
    await deleteContract(contract.id);
    await load();
    notifyUndo(`Contract with "${contract.partyName}" deleted.`, () =>
      handleCreateContract(contract)
    );
  }

  async function handleCreateMeetingMinutes(
    data: Partial<MeetingMinutesInput>
  ): Promise<MeetingMinutes> {
    if (!project) throw new Error("Project not loaded");
    const created = await createMeetingMinutes(project.id, data);
    await load();
    return created;
  }

  async function handleUpdateMeetingMinutes(
    meeting: MeetingMinutes,
    data: Partial<MeetingMinutesInput>
  ): Promise<MeetingMinutes> {
    const updated = await updateMeetingMinutes(meeting.id, data);
    await load();
    return updated;
  }

  async function handleDeleteMeetingMinutes(meeting: MeetingMinutes) {
    await deleteMeetingMinutes(meeting.id);
    await load();
    notifyUndo(
      `Meeting minutes for ${formatDate(meeting.meetingDate)} deleted (any attachments and linked actions are not restored).`,
      async () => {
        await handleCreateMeetingMinutes(meeting);
      }
    );
  }

  async function handleUploadMeetingAttachment(meetingId: string, file: File) {
    if (!project) return;
    const result = await uploadAttachment(project.id, file, meetingId);
    await load();
    return result.actionImport;
  }

  async function handleImportMeetingActions(
    meetingId: string,
    fileName: string,
    actions: { action: string; ownerInMinutes: string; dueText: string }[]
  ) {
    const result = await importMeetingActions(meetingId, fileName, actions);
    await load();
    return result;
  }

  async function handleGenerateMeetingMinutesDraft(input: {
    text?: string;
    file?: File;
    onProgress?: (message: string) => void;
  }): Promise<MeetingMinutesDraft> {
    if (!project) throw new Error("Project not loaded");
    return generateMeetingMinutesDraft(project.id, input);
  }

  async function handleExtractMeetingActions(meetingId: string): Promise<SuggestedAction[]> {
    const { actions } = await extractMeetingActions(meetingId);
    return actions;
  }

  const revisedTargetCompletion = useMemo(
    () => (project ? revisedCompletionDate(project, eotClaims) : null),
    [project, eotClaims]
  );

  // List this project under Recent projects in the left menu.
  useEffect(() => {
    if (user && project) rememberRecentProject(user.id, { id: project.id, name: project.name });
  }, [user, project?.id, project?.name]);

  const health = useMemo(
    () =>
      project
        ? computeProjectHealth(project, cashFlowEntries, variations, risks, eotClaims)
        : null,
    [project, cashFlowEntries, variations, risks, eotClaims]
  );

  if (loading) {
    return (
      <AppLayout title="Loading project…">
        <div className="space-y-6">
          <SkeletonCard lines={4} />
          <SkeletonSections />
        </div>
      </AppLayout>
    );
  }

  if (error || !project) {
    return (
      <AppLayout title="Project not found">
        <div className="max-w-3xl">
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-3">
            {error || "Project not found"}
          </div>
          <Link
            to="/"
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm mt-4 inline-block"
          >
            ← Back to dashboard
          </Link>
        </div>
      </AppLayout>
    );
  }

  // Item counts per section: a section whose list has more than
  // COLLAPSE_THRESHOLD items shows only the first few until expanded (see
  // useShowMore), and gets Expand all / Collapse all in the Jump-to row.
  const sectionCounts: Record<string, number> = {
    "stakeholders": stakeholders.length,
    "actions": actionItems.length,
    "meeting-minutes": meetingMinutes.length,
    "activity": activity.length,
    "milestones": milestones.length,
    "tasks": (project.tasks ?? []).length,
    "delays": delays.length,
    "eot-claims": eotClaims.length,
    "checklist": checklistItems.filter((c) => c.phase !== "PROCUREMENT").length,
    "contracts": contracts.length,
    "cash-flow": cashFlowEntries.length,
    "variations": variations.length,
    "payment-claims": paymentClaims.length,
    "insurance-warranties": insuranceWarranties.length,
    "permits": permits.length,
    "tender-packages": tenderPackages.length,
    "tender-submissions": tenderSubmissions.length,
    "procurement-checklist": checklistItems.filter((c) => c.phase === "PROCUREMENT").length,
    "subcontractors": subcontractors.length,
    "performance-reviews": performanceReviews.length,
    "risks": risks.length,
    "sqe": sqeRecords.length,
    "environmental-monitoring": environmentalMonitoring.length,
    "safety-inspections": safetyInspections.length,
    "defects": defects.length,
    "rfis": rfis.length,
    "documents": documents.length,
    "correspondence": correspondence.length,
    "site-visits": siteVisits.length,
    "enquiries": communityEnquiries.length,
    "attachments": attachments.length,
    "archive-links": archiveLinks.length,
    "lessons-learned": lessons.length,
    "training-records": trainingRecords.length,
    "toolbox-talks": toolboxTalks.length,
  };
  const collapsibleInTab = TAB_SECTIONS[activeTab]
    .map((sec) => sec.id)
    .filter((sectionId) => (sectionCounts[sectionId] ?? 0) > COLLAPSE_THRESHOLD);
  const isHidden = (sectionId: string) => hideEmpty && sectionCounts[sectionId] === 0;
  const visibleSections = Object.fromEntries(
    Object.entries(TAB_SECTIONS).map(([tab, list]) => [tab, list.filter((sec) => !isHidden(sec.id))])
  ) as Record<ProjectTabId, JumpSection[]>;
  function section(sectionId: string) {
    return {
      id: sectionId,
      className: isHidden(sectionId)
        ? "hidden"
        : WIDE_SECTIONS.has(sectionId)
          ? WIDE_SECTION
          : undefined,
      expanded: expandedSections.has(sectionId),
      onExpandedChange: (value: boolean) => setSectionsExpanded([sectionId], value),
    };
  }

  const canModify = canModifyProject(project, user);
  const budgetChange =
    project.latestApprovedBudget !== null && project.budget !== null
      ? Number(project.latestApprovedBudget) - Number(project.budget)
      : null;

  return (
    <AppLayout
      title={project.name}
      subtitle={
        <span className="flex items-center gap-2 flex-wrap">
          {project.projectNumber && <span>{project.projectNumber}</span>}
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              STATUS_COLORS[project.status]
            }`}
          >
            {STATUS_LABELS[project.status]}
          </span>
          {health && <HealthBadge health={health} detailed />}
        </span>
      }
      actions={
        <>
          <ChangeHistoryButton projectId={project.id} />
          <Link
            to={`/projects/${project.id}/summary`}
            className="px-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            title="One-page summary for steering committees and sponsors (PDF)"
          >
            Summary PDF
          </Link>
          <Link
            to={`/projects/${project.id}/closeout-report`}
            className="px-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Closeout Report
          </Link>
          {canModify ? (
            <>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Edit
              </button>
              <MoreMenu onDelete={handleDeleteProject} />
            </>
          ) : (
            project.createdBy && (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Only {project.createdBy.name} or an admin can edit this project
              </span>
            )
          )}
        </>
      }
      secondaryNav={
        <ProjectSectionMenu
          projectId={project.id}
          tabs={PROJECT_TABS}
          sections={visibleSections}
          counts={sectionCounts}
          hideEmpty={hideEmpty}
          onToggleHideEmpty={toggleHideEmpty}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          {...(collapsibleInTab.length > 0 && {
            onExpandAll: () => setSectionsExpanded(collapsibleInTab, true),
            onCollapseAll: () => setSectionsExpanded(collapsibleInTab, false),
          })}
        />
      }
    >
      <div className="flex flex-col gap-6 pb-16 md:pb-0">
        <Link
          to="/?tab=projects"
          className="self-start lg:hidden text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← All projects
        </Link>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <section
            aria-labelledby="project-details-heading"
            className="xl:col-span-2 card p-4"
          >
            <h2 id="project-details-heading" className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Project details
            </h2>
            {project.description && (
              <FormattedText
                className="text-slate-700 dark:text-slate-300 text-sm mb-4"
                text={project.description}
              />
            )}
            <dl className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
              <Field label="Project Number" value={project.projectNumber || "—"} />
              <Field label="BP Ref. No." value={project.bpRefNo || "—"} />
              <Field label="Asset Type" value={project.assetType || "—"} />
              <Field label="Project Manager" value={project.projectManager || "—"} />
              <Field label="Project Director" value={project.projectDirector || "—"} />
              <Field label="Project Sponsor" value={project.projectSponsor || "—"} />
              <Field label="Location" value={project.location || "—"} />
              <Field label="Contractor" value={project.contractor || "—"} />
              <Field label="Consultant" value={project.consultant || "—"} />
              <Field
                label="TRIM Folder"
                value={
                  trimHref(project.trimFolder, trimRecordUrl) ? (
                    <a
                      href={trimHref(project.trimFolder, trimRecordUrl)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                    >
                      Open in TRIM
                    </a>
                  ) : (
                    <span className="break-all">{project.trimFolder || "—"}</span>
                  )
                }
              />
              <Field label="Created By" value={project.createdBy?.name || "—"} />
            </dl>
          </section>

          <section
            aria-labelledby="at-a-glance-heading"
            className="card p-4"
          >
            <h2 id="at-a-glance-heading" className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              At a glance
            </h2>
            <ProjectProgressStrip
              project={project}
              cashFlowEntries={cashFlowEntries}
              revisedTargetCompletion={revisedTargetCompletion}
            />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Field label="Original Budget" value={formatCurrency(project.budget)} />
              {project.latestApprovedBudget !== null && (
                <Field
                  label="Latest Approved Budget"
                  value={
                    <>
                      {formatCurrency(project.latestApprovedBudget)}
                      {budgetChange !== null && budgetChange !== 0 && (
                        <span
                          className={`block text-xs font-normal ${
                            budgetChange > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {budgetChange > 0 ? "+" : "−"}
                          {formatCurrency(Math.abs(budgetChange))} vs original
                        </span>
                      )}
                    </>
                  }
                />
              )}
              <Field label="Start Date" value={formatDate(project.startDate)} />
              <Field label="Target Completion" value={formatDate(project.targetCompletionDate)} />
              {revisedTargetCompletion &&
                revisedTargetCompletion !== project.targetCompletionDate && (
                  <Field label="Revised Completion" value={formatDate(revisedTargetCompletion)} />
                )}
              <Field label="Actual Completion" value={formatDate(project.actualCompletionDate)} />
            </dl>
          </section>
        </div>

        <ProjectOpenItems
          items={[
            { label: "Open risks", icon: "alert", count: risks.filter((r) => r.status !== "CLOSED").length, tab: "quality", section: "risks" },
            { label: "Open actions", icon: "checkCircle", count: actionItems.filter((a) => a.status !== "DONE").length, tab: "overview", section: "actions" },
            { label: "Open defects", icon: "wrench", count: defects.filter((d) => d.status === "OPEN" || d.status === "DISPUTED").length, tab: "quality", section: "defects" },
            { label: "Open RFIs", icon: "message", count: rfis.filter((r) => r.status === "OPEN").length, tab: "quality", section: "rfis" },
          ]}
          milestones={milestones}
          onGo={(tab, section) => {
            setActiveTab(tab as ProjectTabId);
            window.setTimeout(() => {
              const el = document.getElementById(section);
              if (!el) return;
              const header = document.querySelector("header");
              const top = el.getBoundingClientRect().top + window.scrollY - (header?.getBoundingClientRect().height ?? 0) - 12;
              window.scrollTo({ top, behavior: "smooth" });
            }, 200);
          }}
        />

        <div className="lg:hidden">
          <Tabs tabs={PROJECT_TABS} active={activeTab} onChange={setActiveTab} />
        </div>
        <SectionJumpNav
          className="lg:hidden"
          sections={visibleSections[activeTab]}
          {...(collapsibleInTab.length > 0 && {
            onExpandAll: () => setSectionsExpanded(collapsibleInTab, true),
            onCollapseAll: () => setSectionsExpanded(collapsibleInTab, false),
          })}
        />
        <div className="flex items-center justify-between gap-3 -mb-3">
          <h2 className="hidden lg:block text-base font-semibold text-slate-900 dark:text-slate-100">
            {PROJECT_TABS.find((t) => t.id === activeTab)?.label}
          </h2>
          <button
            type="button"
            onClick={toggleHideEmpty}
            className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline"
            title="Only for this project, in this browser. Nothing is deleted."
          >
            {hideEmpty ? "Show empty sections" : "Hide empty sections"}
          </button>
        </div>
        {hideEmpty && TAB_SECTIONS[activeTab].length > 0 && visibleSections[activeTab].length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Every section in this group is empty and hidden.{" "}
            <button type="button" onClick={toggleHideEmpty} className="text-blue-600 dark:text-blue-400 hover:underline">
              Show them
            </button>{" "}
            to add something.
          </p>
        )}

        {/* Each group's sections load the first time you open that group. */}
        <Suspense fallback={<SkeletonSections />}>
        <div className="grid grid-cols-1 min-[1800px]:grid-cols-2 gap-6 items-start [&>*]:min-w-0">
          {activeTab === "overview" && (
            <>
              <CollapsibleSection {...section("stakeholders")}>
                <StakeholdersPanel
                  stakeholders={stakeholders}
                  onCreate={handleCreateStakeholder}
                  onUpdate={handleUpdateStakeholder}
                  onDelete={handleDeleteStakeholder}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("actions")}>
                <ActionsPanel
                  actionItems={actionItems}
                  onCreate={handleCreateActionItem}
                  onUpdate={handleUpdateActionItem}
                  onDelete={handleDeleteActionItem}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("meeting-minutes")}>
                <MeetingMinutesPanel
                  projectName={project.name}
                  meetings={meetingMinutes}
                  attachments={attachments}
                  actionItems={actionItems}
                  tasks={project.tasks ?? []}
                  onCreateTask={handleCreateMeetingTask}
                  onCreate={handleCreateMeetingMinutes}
                  onUpdate={handleUpdateMeetingMinutes}
                  onDelete={handleDeleteMeetingMinutes}
                  onUploadAttachment={handleUploadMeetingAttachment}
                  onImportActions={handleImportMeetingActions}
                  onDeleteAttachment={handleDeleteAttachment}
                  onCreateAction={handleCreateActionItem}
                  onExtractActions={handleExtractMeetingActions}
                  onGenerateDraft={handleGenerateMeetingMinutesDraft}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("activity")}
                className={`${section("activity").className ?? ""} bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4`}>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Activity
                </h2>
                <ActivityFeed entries={activity} emptyMessage="No activity recorded yet." />
              </CollapsibleSection>
            </>
          )}

          {activeTab === "schedule" && (
            <>
              <div id="timeline" className={WIDE_SECTION}>
                <ProjectTimeline
                  project={project}
                  milestones={milestones}
                  tasks={project.tasks ?? []}
                  onUpdateMilestone={handleUpdateMilestone}
                />
              </div>

              <CollapsibleSection {...section("milestones")}>
                <MilestonesPanel
                  milestones={milestones}
                  onCreate={handleCreateMilestone}
                  onUpdate={handleUpdateMilestone}
                  onDelete={handleDeleteMilestone}
                  onReorder={handleReorderMilestone}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("tasks")} className="space-y-3">
                <ApplyTaskTemplateControl onApply={handleApplyTaskTemplate} />

                <TaskList
                  tasks={project.tasks ?? []}
                  onAdd={handleAddTask}
                  onUpdate={handleUpdateTask}
                  onDelete={handleDeleteTask}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("delays")}>
                <DelaysPanel
                  delays={delays}
                  onCreate={handleCreateDelay}
                  onUpdate={handleUpdateDelay}
                  onDelete={handleDeleteDelay}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("eot-claims")}>
                <EotPanel
                  claims={eotClaims}
                  onCreate={handleCreateEotClaim}
                  onUpdate={handleUpdateEotClaim}
                  onDelete={handleDeleteEotClaim}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("checklist")}>
                <ChecklistPanel
                  items={checklistItems}
                  onCreate={handleCreateChecklistItem}
                  onUpdate={handleUpdateChecklistItem}
                  onDelete={handleDeleteChecklistItem}
                />
              </CollapsibleSection>
            </>
          )}

          {activeTab === "budget" && (
            <>
              <div className={WIDE_SECTION}>
                <CostForecastCard
                  project={project}
                  cashFlowEntries={cashFlowEntries}
                  variations={variations}
                  contracts={contracts}
                />
              </div>
              <CollapsibleSection {...section("contracts")}>
                <ContractsPanel
                  contracts={contracts}
                  paymentClaims={paymentClaims}
                  onCreate={handleCreateContract}
                  onUpdate={handleUpdateContract}
                  onDelete={handleDeleteContract}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("cash-flow")}>
                <CashFlowPanel
                  project={project}
                  entries={cashFlowEntries}
                  variations={variations}
                  onUpsert={handleUpsertCashFlowEntry}
                  onUpdate={handleUpdateCashFlowEntry}
                  onDelete={handleDeleteCashFlowEntry}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("variations")}>
                <VariationsPanel
                  variations={variations}
                  onCreate={handleCreateVariation}
                  onUpdate={handleUpdateVariation}
                  onDelete={handleDeleteVariation}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("payment-claims")}>
                <PaymentClaimsPanel
                  claims={paymentClaims}
                  contracts={contracts}
                  onCreate={handleCreatePaymentClaim}
                  onUpdate={handleUpdatePaymentClaim}
                  onDelete={handleDeletePaymentClaim}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("insurance-warranties")}>
                <InsuranceWarrantiesPanel
                  items={insuranceWarranties}
                  onCreate={handleCreateInsuranceWarranty}
                  onUpdate={handleUpdateInsuranceWarranty}
                  onDelete={handleDeleteInsuranceWarranty}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("permits")}>
                <PermitsPanel
                  permits={permits}
                  onCreate={handleCreatePermit}
                  onUpdate={handleUpdatePermit}
                  onDelete={handleDeletePermit}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("subcontractors")}>
                <SubcontractorsPanel
                  subcontractors={subcontractors}
                  onCreate={handleCreateSubcontractor}
                  onUpdate={handleUpdateSubcontractor}
                  onDelete={handleDeleteSubcontractor}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("performance-reviews")}>
                <PerformanceReviewsPanel
                  items={performanceReviews}
                  onCreate={handleCreatePerformanceReview}
                  onUpdate={handleUpdatePerformanceReview}
                  onDelete={handleDeletePerformanceReview}
                />
              </CollapsibleSection>
            </>
          )}

          {activeTab === "procurement" && (
            <>
              <CollapsibleSection {...section("tender-packages")}>
                <TenderPackagesPanel
                  tenderPackages={tenderPackages}
                  onCreate={handleCreateTenderPackage}
                  onUpdate={handleUpdateTenderPackage}
                  onDelete={handleDeleteTenderPackage}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("tender-submissions")}>
                <TenderSubmissionsPanel
                  tenderPackages={tenderPackages}
                  submissions={tenderSubmissions}
                  onCreate={handleCreateTenderSubmission}
                  onUpdate={handleUpdateTenderSubmission}
                  onDelete={handleDeleteTenderSubmission}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("procurement-checklist")}>
                <ChecklistPanel
                  items={checklistItems}
                  phases={["PROCUREMENT"]}
                  title="Procurement Checklist"
                  emptyText="No procurement checklist items yet."
                  csvFilename="procurement-checklist"
                  standardItems={STANDARD_PROCUREMENT_CHECKLIST}
                  onCreateMany={handleCreateChecklistItems}
                  onCreate={handleCreateChecklistItem}
                  onUpdate={handleUpdateChecklistItem}
                  onDelete={handleDeleteChecklistItem}
                />
              </CollapsibleSection>
            </>
          )}

          {activeTab === "quality" && (
            <>
              {risks.length > 0 && <RiskHeatMap risks={risks} />}
              <CollapsibleSection {...section("risks")}>
                <RisksPanel
                  risks={risks}
                  onCreate={handleCreateRisk}
                  onUpdate={handleUpdateRisk}
                  onDelete={handleDeleteRisk}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("sqe")}>
                <SqePanel
                  records={sqeRecords}
                  onCreate={handleCreateSqeRecord}
                  onUpdate={handleUpdateSqeRecord}
                  onDelete={handleDeleteSqeRecord}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("environmental-monitoring")}>
                <EnvironmentalMonitoringPanel
                  records={environmentalMonitoring}
                  onCreate={handleCreateEnvironmentalMonitoring}
                  onUpdate={handleUpdateEnvironmentalMonitoring}
                  onDelete={handleDeleteEnvironmentalMonitoring}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("safety-inspections")}>
                <SafetyInspectionsPanel
                  inspections={safetyInspections}
                  onCreate={handleCreateSafetyInspection}
                  onUpdate={handleUpdateSafetyInspection}
                  onDelete={handleDeleteSafetyInspection}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("defects")}>
                <DefectsPanel
                  defects={defects}
                  onCreate={handleCreateDefect}
                  onUpdate={handleUpdateDefect}
                  onDelete={handleDeleteDefect}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("rfis")}>
                <RfisPanel
                  rfis={rfis}
                  onCreate={handleCreateRfi}
                  onUpdate={handleUpdateRfi}
                  onDelete={handleDeleteRfi}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("documents")}>
                <DocumentsPanel
                  documents={documents}
                  onCreate={handleCreateDocument}
                  onUpdate={handleUpdateDocument}
                  onDelete={handleDeleteDocument}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("correspondence")}>
                <CorrespondencePanel
                  items={correspondence}
                  onCreate={handleCreateCorrespondence}
                  onUpdate={handleUpdateCorrespondence}
                  onDelete={handleDeleteCorrespondence}
                />
              </CollapsibleSection>
            </>
          )}

          {activeTab === "site" && (
            <>
              <CollapsibleSection {...section("site-visits")}>
                <SiteVisitsPanel
                  siteVisits={siteVisits}
                  photosByVisit={groupPhotosByVisit(sitePhotos)}
                  allPhotos={sitePhotos}
                  onCreate={handleCreateSiteVisit}
                  onUpdate={handleUpdateSiteVisit}
                  onDelete={handleDeleteSiteVisit}
                  onUploadPhotos={handleUploadSiteVisitPhotos}
                  onDeletePhoto={handleDeleteSiteVisitPhoto}
                  onSyncPhotoToArchive={handleSyncPhotoToArchive}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("enquiries")}>
                <EnquiriesPanel
                  enquiries={communityEnquiries}
                  onCreate={handleCreateCommunityEnquiry}
                  onUpdate={handleUpdateCommunityEnquiry}
                  onDelete={handleDeleteCommunityEnquiry}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("attachments")}>
                <AttachmentsPanel
                  attachments={attachments}
                  onUpload={handleUploadAttachment}
                  onDelete={handleDeleteAttachment}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("archive-links")}>
                <ArchiveLinksPanel
                  links={archiveLinks}
                  onCreate={handleCreateArchiveLink}
                  onDelete={handleDeleteArchiveLink}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("lessons-learned")}>
                <LessonsLearnedPanel
                  lessons={lessons}
                  onCreate={handleCreateLesson}
                  onUpdate={handleUpdateLesson}
                  onDelete={handleDeleteLesson}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("training-records")}>
                <TrainingRecordsPanel
                  items={trainingRecords}
                  onCreate={handleCreateTrainingRecord}
                  onUpdate={handleUpdateTrainingRecord}
                  onDelete={handleDeleteTrainingRecord}
                />
              </CollapsibleSection>

              <CollapsibleSection {...section("toolbox-talks")}>
                <ToolboxTalksPanel
                  talks={toolboxTalks}
                  onCreate={handleCreateToolboxTalk}
                  onUpdate={handleUpdateToolboxTalk}
                  onDelete={handleDeleteToolboxTalk}
                />
              </CollapsibleSection>
            </>
          )}

          {activeTab === "monthly-reporting" && project && (
            <div className="min-[1800px]:col-span-2">
            <MonthlyReportingPanel
              project={project}
              reports={reports}
              currentUser={user}
              onReportsChange={setReports}
            />
            </div>
          )}

        </div>
        </Suspense>
      </div>

      {/* Phones: the things most often added on site, one tap away. */}
      {!isViewer && (
        <nav
          aria-label="Quick add"
          className="md:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-4 border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
        >
          {[
            { label: "Action", kind: "action" as const },
            { label: "Defect", kind: "defect" as const },
            { label: "Site visit", kind: "site-visit" as const },
          ].map((b) => (
            <button
              key={b.kind}
              type="button"
              onClick={() => openQuickAdd(b.kind)}
              className="py-2.5 text-xs text-slate-700 dark:text-slate-200 flex flex-col items-center gap-0.5"
            >
              <Icon name="plus" className="w-5 h-5" />
              {b.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setActiveTab("site");
              window.setTimeout(() => document.getElementById("site-visits")?.scrollIntoView({ behavior: "smooth" }), 150);
            }}
            className="py-2.5 text-xs text-slate-700 dark:text-slate-200 flex flex-col items-center gap-0.5"
          >
            <Icon name="camera" className="w-5 h-5" />
            Photos
          </button>
        </nav>
      )}

      {showModal && (
        <ProjectFormModal
          project={project}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </AppLayout>
  );
}

function groupPhotosByVisit(
  photos: SiteVisitPhoto[]
): Record<string, SiteVisitPhoto[]> {
  const grouped: Record<string, SiteVisitPhoto[]> = {};
  for (const photo of photos) {
    (grouped[photo.siteVisitId] ??= []).push(photo);
  }
  return grouped;
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">{value}</dd>
    </div>
  );
}

// The project's ⋯ menu: Delete, kept out of the way of Edit.
function MoreMenu({ onDelete }: { onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More project actions"
        title="More"
        className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
      >
        ⋯
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-48 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1 z-40"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            Delete project…
          </button>
        </div>
      )}
    </div>
  );
}
