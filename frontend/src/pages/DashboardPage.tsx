import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTabParam } from "../useTabParam";
import { batched } from "../batch";
import {
  ActionItem,
  ActivityLogEntry,
  CashFlowEntry,
  CommunityEnquiry,
  Correspondence,
  Subcontractor,
  DefectItem,
  EnvironmentalMonitoringRecord,
  EotClaim,
  InsuranceWarranty,
  SafetyInspection,
  PaymentClaim,
  Permit,
  Project,
  ProjectInput,
  ProjectStatus,
  Rfi,
  Risk,
  SqeRecord,
  Task,
  TaskInput,
  TaskRecurrence,
  TenderPackage,
  PerformanceReview,
  TrainingRecord,
  Variation,
} from "../types";
import {
  createPortfolioTask,
  createProject,
  deleteProject,
  deleteTask,
  getAllActionItems,
  getAllCashFlowEntries,
  getAllCommunityEnquiries,
  getAllCorrespondence,
  getAllSubcontractors,
  getAllDefects,
  getAllEnvironmentalMonitoring,
  getAllEotClaims,
  getAllSafetyInspections,
  getAllInsuranceWarranties,
  getAllPaymentClaims,
  getAllPermits,
  getAllRfis,
  getAllRisks,
  getAllSqeRecords,
  getAllTenderPackages,
  getAllPerformanceReviews,
  getAllTrainingRecords,
  getAllVariations,
  getPortfolioTasks,
  getProjects,
  getRecentActivity,
  getUpcomingTasks,
  updateActionItem,
  updateProject,
  updateTask,
  updateDashboardView,
  getHealthHistory,
  HealthHistoryPoint,
} from "../api";
import StatCards from "../components/StatCards";
import { isProjectOverdue } from "../statusMeta";
import TaskList from "../components/TaskList";
import ProjectTable from "../components/ProjectTable";
import ProjectFormModal from "../components/ProjectFormModal";
import ActivityFeed from "../components/ActivityFeed";
import TopRisksPanel from "../components/TopRisksPanel";
import TodayAndUpcomingPanel from "../components/TodayAndUpcomingPanel";
import ExpiringPermitsPanel from "../components/ExpiringPermitsPanel";
import ExpiringInsuranceWarrantiesPanel from "../components/ExpiringInsuranceWarrantiesPanel";
import OpenSqePanel from "../components/OpenSqePanel";
import EnvironmentalExceedancesPanel from "../components/EnvironmentalExceedancesPanel";
import OpenSafetyInspectionsPanel from "../components/OpenSafetyInspectionsPanel";
import ActiveTendersPanel from "../components/ActiveTendersPanel";
import TrimLinksPanel from "../components/TrimLinksPanel";
import OpenDefectsPanel from "../components/OpenDefectsPanel";
import OpenPaymentClaimsPanel from "../components/OpenPaymentClaimsPanel";
import OpenRfisPanel from "../components/OpenRfisPanel";
import OpenEnquiriesPanel from "../components/OpenEnquiriesPanel";
import OpenCorrespondencePanel from "../components/OpenCorrespondencePanel";
import ExpiringSubcontractorInsurancePanel from "../components/ExpiringSubcontractorInsurancePanel";
import ExpiringTrainingPanel from "../components/ExpiringTrainingPanel";
import LowPerformingContractorsPanel from "../components/LowPerformingContractorsPanel";
import ChartCard from "../components/ChartCard";
import HorizontalBarChart, { BarDatum } from "../charts/HorizontalBarChart";
import PortfolioCumulativeSpendChart from "../charts/PortfolioCumulativeSpendChart";
import { SEQUENTIAL_BLUE, chartColor } from "../charts/palette";
import { useTheme } from "../theme/ThemeContext";
import { ALL_STATUSES, STATUS_LABELS } from "../statusMeta";
import { computeProjectHealth, ProjectHealth } from "../health";
import NeedsAttentionPanel from "../components/NeedsAttentionPanel";
import AppLayout from "../components/AppLayout";
import MyWeekPanel from "../components/MyWeekPanel";
import ProjectBoard from "../components/ProjectBoard";
import PortfolioTimeline from "../components/PortfolioTimeline";
import { Icon } from "../components/icons";
import { onDataChanged } from "../components/QuickAdd";
import { SkeletonTable } from "../components/Skeleton";
import DashboardSideColumn from "../components/DashboardSideColumn";
import { useAuth } from "../auth/AuthContext";
import ExportCsvButton from "../components/ExportCsvButton";
import { formatCurrency, formatDate } from "../format";
import { DashboardView, addSavedView, loadSavedViews, removeSavedView } from "../savedViews";
import { RagStatus } from "../types";
import { useUndoToast } from "../undo/UndoToastContext";
import { useConfirm } from "../confirm/ConfirmContext";

type ProjectViewId = "table" | "board" | "timeline";
const PROJECT_VIEWS: { id: ProjectViewId; label: string; icon: string }[] = [
  { id: "table", label: "Table", icon: "table" },
  { id: "board", label: "Board", icon: "board" },
  { id: "timeline", label: "Timeline", icon: "timeline" },
];

const RAG_LABELS: Record<RagStatus, string> = { GREEN: "Green", AMBER: "Amber", RED: "Red" };

type DashboardTabId =
  | "projects"
  | "today"
  | "week"
  | "alerts"
  | "charts"
  | "activity"
  | "trim";

const DASHBOARD_TABS: { id: DashboardTabId; label: string }[] = [
  { id: "projects", label: "Projects" },
  { id: "today", label: "Today & Upcoming" },
  { id: "week", label: "My week" },
  { id: "alerts", label: "Alerts" },
  { id: "charts", label: "Charts" },
  { id: "activity", label: "Activity" },
  { id: "trim", label: "TRIM & GVW Links" },
];

// The dashboard's last view, saved on the user's account (User.dashboardView)
// so it comes back on their next visit, on any device.
interface DashboardViewState {
  tab: DashboardTabId;
  statusFilter: ProjectStatus | "ALL";
  healthFilter: RagStatus | "ALL";
  overdueOnly: boolean;
  projectManager: string;
  search: string;
}

const RAG_FILTERS: (RagStatus | "ALL")[] = ["ALL", "GREEN", "AMBER", "RED"];

// Reads a saved view defensively — it's stored JSON, so anything unknown
// (e.g. a status that no longer exists) falls back to the default.
function parseDashboardView(raw: unknown): Partial<DashboardViewState> | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  const view: Partial<DashboardViewState> = {};
  if (DASHBOARD_TABS.some((t) => t.id === v.tab)) view.tab = v.tab as DashboardTabId;
  if (v.statusFilter === "ALL" || ALL_STATUSES.includes(v.statusFilter as ProjectStatus)) {
    view.statusFilter = v.statusFilter as ProjectStatus | "ALL";
  }
  if (RAG_FILTERS.includes(v.healthFilter as RagStatus | "ALL")) {
    view.healthFilter = v.healthFilter as RagStatus | "ALL";
  }
  if (typeof v.overdueOnly === "boolean") view.overdueOnly = v.overdueOnly;
  if (typeof v.projectManager === "string") view.projectManager = v.projectManager;
  if (typeof v.search === "string") view.search = v.search;
  return view;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isViewer, patchUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme } = useTheme();
  const { notifyUndo } = useUndoToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [portfolioTasks, setPortfolioTasks] = useState<Task[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLogEntry[]>([]);
  const [cashFlowEntries, setCashFlowEntries] = useState<CashFlowEntry[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [permits, setPermits] = useState<Permit[]>([]);
  const [sqeRecords, setSqeRecords] = useState<SqeRecord[]>([]);
  const [eotClaims, setEotClaims] = useState<EotClaim[]>([]);
  const [defects, setDefects] = useState<DefectItem[]>([]);
  const [paymentClaims, setPaymentClaims] = useState<PaymentClaim[]>([]);
  const [insuranceWarranties, setInsuranceWarranties] = useState<InsuranceWarranty[]>([]);
  const [rfis, setRfis] = useState<Rfi[]>([]);
  const [communityEnquiries, setCommunityEnquiries] = useState<CommunityEnquiry[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [correspondence, setCorrespondence] = useState<Correspondence[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([]);
  const [performanceReviews, setPerformanceReviews] = useState<PerformanceReview[]>([]);
  const [environmentalMonitoring, setEnvironmentalMonitoring] = useState<
    EnvironmentalMonitoringRecord[]
  >([]);
  const [safetyInspections, setSafetyInspections] = useState<SafetyInspection[]>([]);
  const [tenderPackages, setTenderPackages] = useState<TenderPackage[]>([]);
  const [healthHistory, setHealthHistory] = useState<Record<string, HealthHistoryPoint[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "ALL">(
    "ALL"
  );
  const [healthFilter, setHealthFilter] = useState<RagStatus | "ALL">("ALL");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [pmFilter, setPmFilter] = useState("");
  const [search, setSearch] = useState("");
  const [modalProject, setModalProject] = useState<Project | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useTabParam(DASHBOARD_TABS, "projects");
  const [savedViews, setSavedViews] = useState<DashboardView[]>([]);
  const [selectedViewId, setSelectedViewId] = useState("");

  // Restore the user's last dashboard view once, on arrival. An explicit
  // ?tab= in the URL (a link to a specific tab) wins over the saved tab.
  const viewRestoredRef = useRef(false);
  useEffect(() => {
    if (viewRestoredRef.current || !user) return;
    viewRestoredRef.current = true;
    const view = parseDashboardView(user.dashboardView);
    if (!view) return;
    if (view.statusFilter) setStatusFilter(view.statusFilter);
    if (view.healthFilter) setHealthFilter(view.healthFilter);
    if (view.overdueOnly !== undefined) setOverdueOnly(view.overdueOnly);
    if (view.projectManager !== undefined) setPmFilter(view.projectManager);
    if (view.search !== undefined) setSearch(view.search);
    if (view.tab && !searchParams.has("tab")) setActiveTab(view.tab);
    // Only on first arrival — later user changes are saved below.
  }, [user]);

  // Save the view whenever it changes (debounced, and only when it actually
  // differs from what's saved).
  const lastSavedViewRef = useRef(JSON.stringify(user?.dashboardView ?? null));
  useEffect(() => {
    if (!viewRestoredRef.current) return;
    const view: DashboardViewState = {
      tab: activeTab,
      statusFilter,
      healthFilter,
      overdueOnly,
      projectManager: pmFilter,
      search,
    };
    const json = JSON.stringify(view);
    if (json === lastSavedViewRef.current) return;
    const timer = setTimeout(() => {
      updateDashboardView({ ...view })
        .then(() => {
          lastSavedViewRef.current = json;
          patchUser({ dashboardView: { ...view } });
        })
        .catch(() => {
          // Not worth interrupting anyone over: the view just isn't saved.
        });
    }, 800);
    return () => clearTimeout(timer);
  }, [activeTab, statusFilter, healthFilter, overdueOnly, pmFilter, search]);

  useEffect(() => {
    setSavedViews(loadSavedViews());
  }, []);

  const hasLoadedRef = useRef(false);

  // Only the very first load shows the "Loading…" state; after a project is
  // created/edited/deleted this refreshes in the background so the table,
  // alerts and charts don't blank out and collapse the page (jumping the
  // scroll position) on every change.
  async function loadData() {
    const initial = !hasLoadedRef.current;
    if (initial) setLoading(true);
    setError(null);
    let refreshAfter = false;
    try {
      const [
        projectData,
        taskData,
        portfolioTaskData,
        activityData,
        cashFlowData,
        variationData,
        riskData,
        actionItemData,
        permitData,
        sqeData,
        eotData,
        defectData,
        paymentClaimData,
        insuranceWarrantyData,
        rfiData,
        communityEnquiryData,
        subcontractorData,
        correspondenceData,
        trainingRecordData,
        performanceReviewData,
        environmentalMonitoringData,
        safetyInspectionData,
        tenderPackageData,
        healthHistoryData,
      ] = await batched(() => Promise.all([
        getProjects(),
        getUpcomingTasks(),
        getPortfolioTasks(),
        getRecentActivity(),
        getAllCashFlowEntries(),
        getAllVariations(),
        getAllRisks(),
        getAllActionItems(),
        getAllPermits(),
        getAllSqeRecords(),
        getAllEotClaims(),
        getAllDefects(),
        getAllPaymentClaims(),
        getAllInsuranceWarranties(),
        getAllRfis(),
        getAllCommunityEnquiries(),
        getAllSubcontractors(),
        getAllCorrespondence(),
        getAllTrainingRecords(),
        getAllPerformanceReviews(),
        getAllEnvironmentalMonitoring(),
        getAllSafetyInspections(),
        getAllTenderPackages(),
        getHealthHistory().catch(() => ({})),
      ]), { preferCache: initial, onCacheHit: () => (refreshAfter = true) });
      setProjects(projectData);
      setUpcomingTasks(taskData);
      setPortfolioTasks(portfolioTaskData);
      setRecentActivity(activityData);
      setCashFlowEntries(cashFlowData);
      setVariations(variationData);
      setRisks(riskData);
      setActionItems(actionItemData);
      setPermits(permitData);
      setSqeRecords(sqeData);
      setDefects(defectData);
      setPaymentClaims(paymentClaimData);
      setInsuranceWarranties(insuranceWarrantyData);
      setRfis(rfiData);
      setEotClaims(eotData);
      setCommunityEnquiries(communityEnquiryData);
      setSubcontractors(subcontractorData);
      setCorrespondence(correspondenceData);
      setTrainingRecords(trainingRecordData);
      setPerformanceReviews(performanceReviewData);
      setEnvironmentalMonitoring(environmentalMonitoringData);
      setSafetyInspections(safetyInspectionData);
      setTenderPackages(tenderPackageData);
      setHealthHistory(healthHistoryData);
      hasLoadedRef.current = true;
    } catch (err) {
      if (initial) setError(err instanceof Error ? err.message : "Failed to load data");
      else console.error("Background refresh failed", err);
    } finally {
      if (initial) setLoading(false);
    }
    // Drawn from the last visit's data: now fetch the latest quietly.
    if (refreshAfter) loadData();
  }

  useEffect(() => {
    loadData();
    // Something was added from the top bar's "+ New": refresh quietly.
    return onDataChanged(() => loadData());
  }, []);

  // "+ New → Project" from another page lands here with ?new=project.
  useEffect(() => {
    if (searchParams.get("new") !== "project" || isViewer) return;
    openNewProject();
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("new");
        return next;
      },
      { replace: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Table, Board or Timeline, remembered in this browser.
  const [projectView, setProjectView] = useState<ProjectViewId>(() => {
    try {
      const v = localStorage.getItem("apd.projectView");
      return v === "board" || v === "timeline" ? v : "table";
    } catch {
      return "table";
    }
  });
  function changeProjectView(v: ProjectViewId) {
    setProjectView(v);
    try {
      localStorage.setItem("apd.projectView", v);
    } catch {
      // not remembered
    }
  }
  async function changeStatus(project: Project, status: ProjectStatus) {
    await updateProject(project.id, { status });
    await loadData();
  }

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<ProjectStatus, number>> = {};
    for (const p of projects) counts[p.status] = (counts[p.status] ?? 0) + 1;
    return counts;
  }, [projects]);

  const statusData: BarDatum[] = useMemo(
    () =>
      ALL_STATUSES.map((status) => ({
        label: STATUS_LABELS[status],
        value: projects.filter((p) => p.status === status).length,
      })),
    [projects]
  );

  const healthByProjectId: Record<string, ProjectHealth> = useMemo(() => {
    const result: Record<string, ProjectHealth> = {};
    for (const project of projects) {
      const projectEntries = cashFlowEntries.filter((e) => e.projectId === project.id);
      const projectVariations = variations.filter((v) => v.projectId === project.id);
      const projectRisks = risks.filter((r) => r.projectId === project.id);
      const projectEotClaims = eotClaims.filter((c) => c.projectId === project.id);
      result[project.id] = computeProjectHealth(
        project,
        projectEntries,
        projectVariations,
        projectRisks,
        projectEotClaims
      );
    }
    return result;
  }, [projects, cashFlowEntries, variations, risks, eotClaims]);

  const projectManagers = useMemo(() => {
    const names = new Set<string>();
    for (const p of projects) {
      if (p.projectManager) names.add(p.projectManager);
    }
    return Array.from(names).sort();
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (healthFilter !== "ALL" && healthByProjectId[p.id]?.overall !== healthFilter) return false;
      if (pmFilter && p.projectManager !== pmFilter) return false;
      if (overdueOnly && !isProjectOverdue(p)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = `${p.name} ${p.projectNumber ?? ""} ${p.location ?? ""} ${
          p.projectManager ?? ""
        }`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [projects, statusFilter, healthFilter, pmFilter, overdueOnly, search, healthByProjectId]);

  function applyView(viewId: string) {
    setSelectedViewId(viewId);
    const view = savedViews.find((v) => v.id === viewId);
    if (!view) return;
    setStatusFilter(view.statusFilter);
    setHealthFilter(view.healthFilter);
    setPmFilter(view.projectManager);
    setSearch(view.search);
  }

  function handleSaveView() {
    const name = prompt("Name this view (e.g. \"My overdue projects\"):");
    if (!name || !name.trim()) return;
    const updated = addSavedView({
      name: name.trim(),
      statusFilter,
      healthFilter,
      projectManager: pmFilter,
      search,
    });
    setSavedViews(updated);
    setSelectedViewId(updated[updated.length - 1].id);
  }

  const confirm = useConfirm();

  async function handleDeleteView() {
    if (!selectedViewId) return;
    const view = savedViews.find((v) => v.id === selectedViewId);
    if (!view || !await confirm(`Delete the saved view "${view.name}"?`)) return;
    setSavedViews(removeSavedView(selectedViewId));
    setSelectedViewId("");
  }

  function openNewProject() {
    setModalProject(null);
    setShowModal(true);
  }

  function openEditProject(project: Project) {
    setModalProject(project);
    setShowModal(true);
  }

  async function handleSave(data: Partial<ProjectInput>) {
    if (modalProject) {
      await updateProject(modalProject.id, data);
    } else {
      await createProject(data);
    }
    setShowModal(false);
    await loadData();
  }

  async function handleDelete(project: Project) {
    if (!await confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    await deleteProject(project.id);
    await loadData();
  }

  async function handleAddPortfolioTask(
    title: string,
    dueDate: string | null,
    recurrence: TaskRecurrence
  ) {
    await createPortfolioTask({ title, dueDate, status: "TODO", recurrence });
    await loadData();
  }

  async function handleUpdatePortfolioTask(task: Task, changes: Partial<TaskInput>) {
    await updateTask(task.id, changes);
    await loadData();
  }

  async function handleDeletePortfolioTask(task: Task) {
    await deleteTask(task.id);
    await loadData();
    notifyUndo(`Task "${task.title}" deleted.`, async () => {
      await createPortfolioTask(task);
      await loadData();
    });
  }

  async function handleCompleteTask(task: Task) {
    await updateTask(task.id, { status: "DONE" });
    await loadData();
  }

  async function handleUpdateTaskDueDate(task: Task, dueDate: string | null) {
    await updateTask(task.id, { dueDate });
    await loadData();
  }

  // Several tasks/actions at once (Today & Upcoming's Select mode): one
  // save each, then a single refresh.
  async function handleBulkUpdate(
    tasks: Task[],
    actions: ActionItem[],
    change: { complete?: boolean; dueDate?: string | null }
  ) {
    await Promise.all([
      ...tasks.map((t) =>
        updateTask(t.id, {
          ...(change.complete ? { status: "DONE" as const } : {}),
          ...(change.dueDate !== undefined ? { dueDate: change.dueDate } : {}),
        })
      ),
      ...actions.map((a) =>
        updateActionItem(a.id, {
          ...(change.complete ? { status: "DONE" as const } : {}),
          ...(change.dueDate !== undefined ? { dueDate: change.dueDate } : {}),
        })
      ),
    ]);
    await loadData();
  }

  async function handleCompleteAction(actionItem: ActionItem) {
    await updateActionItem(actionItem.id, { status: "DONE" });
    await loadData();
  }

  async function handleUpdateActionDueDate(actionItem: ActionItem, dueDate: string | null) {
    await updateActionItem(actionItem.id, { dueDate });
    await loadData();
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] ?? "";
  const myProjectsActive = !!user && pmFilter === user.name;
  const activeTabLabel = DASHBOARD_TABS.find((t) => t.id === activeTab)?.label ?? "Projects";

  return (
    <AppLayout
      title={activeTab === "projects" ? `${greeting}${firstName ? `, ${firstName}` : ""}` : activeTabLabel}
      subtitle={new Date().toLocaleDateString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })}
      actions={
        <>
          {user && (
            <div
              role="group"
              aria-label="Which projects to show"
              className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 p-0.5 text-sm"
            >
              <button
                type="button"
                onClick={() => setPmFilter(user.name)}
                aria-pressed={myProjectsActive}
                className={`px-3 py-1 rounded-md ${
                  myProjectsActive
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
                title="Only projects you manage"
              >
                My projects
              </button>
              <button
                type="button"
                onClick={() => setPmFilter("")}
                aria-pressed={!pmFilter}
                className={`px-3 py-1 rounded-md ${
                  !pmFilter
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                All projects
              </button>
            </div>
          )}
          {!isViewer && (
            <button
              onClick={openNewProject}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              + New Project
            </button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-3">
            {error}
          </div>
        )}

        <StatCards
          projects={projects}
          variations={variations}
          cashFlowEntries={cashFlowEntries}
          onSelect={{
            total: () => {
              setStatusFilter("ALL");
              setOverdueOnly(false);
              setActiveTab("projects");
            },
            inConstruction: () => {
              setStatusFilter("CONSTRUCTION");
              setOverdueOnly(false);
              setActiveTab("projects");
            },
            overdue: () => {
              setStatusFilter("ALL");
              setOverdueOnly(true);
              setActiveTab("projects");
            },
            budget: () => setActiveTab("charts"),
          }}
        />

        {activeTab === "projects" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    statusFilter === "ALL"
                      ? "bg-navy-700 text-white border-navy-700 dark:bg-blue-500 dark:text-white dark:border-blue-500"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500"
                  }`}
                >
                  All
                  <span className="ml-1.5 text-xs opacity-70 tabular-nums">{projects.length}</span>
                </button>
                {ALL_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      statusFilter === s
                        ? "bg-navy-700 text-white border-navy-700 dark:bg-blue-500 dark:text-white dark:border-blue-500"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500"
                    }`}
                  >
                    {STATUS_LABELS[s]}
                    <span className="ml-1.5 text-xs opacity-70 tabular-nums">{statusCounts[s] ?? 0}</span>
                  </button>
                ))}
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, number, location, manager…"
                className="w-full sm:w-72 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="flex gap-2 flex-wrap items-center">
                <select
                  value={healthFilter}
                  onChange={(e) => setHealthFilter(e.target.value as RagStatus | "ALL")}
                  className="text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-2 py-1.5"
                >
                  <option value="ALL">Any health</option>
                  {(["GREEN", "AMBER", "RED"] as RagStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {RAG_LABELS[s]}
                    </option>
                  ))}
                </select>
                {overdueOnly && (
                  <button
                    onClick={() => setOverdueOnly(false)}
                    className="text-sm rounded-full border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 px-3 py-1"
                    title="Clear the overdue filter"
                  >
                    Overdue only ✕
                  </button>
                )}
                <select
                  value={pmFilter}
                  onChange={(e) => setPmFilter(e.target.value)}
                  className="text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-2 py-1.5"
                >
                  <option value="">Any manager</option>
                  {projectManagers.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedViewId}
                  onChange={(e) => applyView(e.target.value)}
                  className="text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-2 py-1.5"
                >
                  <option value="">Saved views…</option>
                  {savedViews.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleSaveView}
                  className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Save current view
                </button>
                {selectedViewId && (
                  <button
                    onClick={handleDeleteView}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Delete view
                  </button>
                )}
              </div>
              <ExportCsvButton
                filename="projects"
                columns={[
                  { header: "Name", key: "name" },
                  { header: "Status", key: "status" },
                  { header: "Health", key: "health" },
                  { header: "Project Number", key: "projectNumber" },
                  { header: "BP Ref No.", key: "bpRefNo" },
                  { header: "Manager", key: "manager" },
                  { header: "Director", key: "director" },
                  { header: "Sponsor", key: "sponsor" },
                  { header: "Location", key: "location" },
                  { header: "Contractor", key: "contractor" },
                  { header: "Consultant", key: "consultant" },
                  { header: "TRIM Folder", key: "trimFolder" },
                  { header: "Original Budget", key: "budget" },
                  { header: "Latest Approved Budget", key: "latestApprovedBudget" },
                  { header: "Contract Value", key: "contractValue" },
                  { header: "Start Date", key: "startDate" },
                  { header: "Target Completion", key: "targetCompletion" },
                  { header: "Actual Completion", key: "actualCompletion" },
                ]}
                rows={filteredProjects.map((p) => ({
                  name: p.name,
                  status: STATUS_LABELS[p.status],
                  health: healthByProjectId[p.id] ? RAG_LABELS[healthByProjectId[p.id].overall] : "",
                  projectNumber: p.projectNumber ?? "",
                  bpRefNo: p.bpRefNo ?? "",
                  manager: p.projectManager ?? "",
                  director: p.projectDirector ?? "",
                  sponsor: p.projectSponsor ?? "",
                  location: p.location ?? "",
                  contractor: p.contractor ?? "",
                  consultant: p.consultant ?? "",
                  trimFolder: p.trimFolder ?? "",
                  budget: p.budget != null ? formatCurrency(p.budget) : "",
                  latestApprovedBudget:
                    p.latestApprovedBudget != null ? formatCurrency(p.latestApprovedBudget) : "",
                  contractValue: p.contractValue != null ? formatCurrency(p.contractValue) : "",
                  startDate: p.startDate ? formatDate(p.startDate) : "",
                  targetCompletion: p.targetCompletionDate ? formatDate(p.targetCompletionDate) : "",
                  actualCompletion: p.actualCompletionDate ? formatDate(p.actualCompletionDate) : "",
                }))}
              />
            </div>

            <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_22rem] gap-6 items-start">
            <div className="min-w-0 space-y-6">
            <div className="flex items-center justify-between gap-3 -mb-3">
              <div role="group" aria-label="Show projects as" className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-sm">
                {PROJECT_VIEWS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={projectView === v.id}
                    onClick={() => changeProjectView(v.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md ${
                      projectView === v.id
                        ? "bg-white dark:bg-slate-950 shadow-sm text-slate-900 dark:text-slate-100 font-medium"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    <Icon name={v.icon} className="w-4 h-4" />
                    {v.label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {filteredProjects.length} of {projects.length} projects
              </span>
            </div>
            {loading ? (
              <SkeletonTable rows={6} />
            ) : projectView === "board" ? (
              <ProjectBoard
                projects={filteredProjects}
                currentUser={user}
                healthByProjectId={healthByProjectId}
                onStatusChange={changeStatus}
                onOpen={(project) => navigate(`/projects/${project.id}`)}
              />
            ) : projectView === "timeline" ? (
              <PortfolioTimeline projects={filteredProjects} onOpen={(project) => navigate(`/projects/${project.id}`)} />
            ) : (
              <ProjectTable
                projects={filteredProjects}
                currentUser={user}
                healthByProjectId={healthByProjectId}
                healthHistory={healthHistory}
                onStatusChange={changeStatus}
                onOpen={(project) => navigate(`/projects/${project.id}`)}
                onEdit={openEditProject}
                onDelete={handleDelete}
              />
            )}

            {!loading && (
              <TaskList
                tasks={portfolioTasks}
                title="Portfolio Tasks"
                description="Relevant to every project — not tied to any single one."
                onAdd={handleAddPortfolioTask}
                onUpdate={handleUpdatePortfolioTask}
                onDelete={handleDeletePortfolioTask}
              />
            )}
            </div>
            {!loading && (
              <DashboardSideColumn
                projects={projects}
                tasks={upcomingTasks}
                actionItems={actionItems}
                projectManager={pmFilter}
                healthByProjectId={healthByProjectId}
              />
            )}
            </div>
          </div>
        )}

        {activeTab === "today" && !loading && (
          <TodayAndUpcomingPanel
            projects={projects}
            tasks={upcomingTasks}
            actionItems={actionItems}
            onCompleteTask={handleCompleteTask}
            onCompleteAction={handleCompleteAction}
            onUpdateTaskDueDate={handleUpdateTaskDueDate}
            onUpdateActionDueDate={handleUpdateActionDueDate}
            onBulkUpdate={handleBulkUpdate}
          />
        )}

        {activeTab === "week" && !loading && (
          <MyWeekPanel
            projects={projects}
            tasks={upcomingTasks}
            actionItems={actionItems}
            permits={permits}
            insuranceWarranties={insuranceWarranties}
            paymentClaims={paymentClaims}
            onCompleteTask={handleCompleteTask}
            onCompleteAction={handleCompleteAction}
          />
        )}

        {activeTab === "alerts" && !loading && projects.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            <NeedsAttentionPanel projects={projects} healthByProjectId={healthByProjectId} />
            <ExpiringPermitsPanel permits={permits} />
            <OpenSqePanel records={sqeRecords} />
            <EnvironmentalExceedancesPanel records={environmentalMonitoring} />
            <OpenSafetyInspectionsPanel inspections={safetyInspections} />
            <ActiveTendersPanel tenderPackages={tenderPackages} />
            <OpenDefectsPanel defects={defects} />
            <OpenPaymentClaimsPanel claims={paymentClaims} />
            <ExpiringInsuranceWarrantiesPanel items={insuranceWarranties} />
            <OpenRfisPanel rfis={rfis} />
            <OpenEnquiriesPanel enquiries={communityEnquiries} />
            <ExpiringSubcontractorInsurancePanel subcontractors={subcontractors} />
            <OpenCorrespondencePanel items={correspondence} />
            <ExpiringTrainingPanel records={trainingRecords} />
            <LowPerformingContractorsPanel reviews={performanceReviews} />
          </div>
        )}

        {activeTab === "charts" && !loading && projects.length > 0 && (
          <div className="space-y-6">
            <ChartCard title="Spend vs Budget Over Time — All Projects">
              <PortfolioCumulativeSpendChart
                projects={projects}
                entries={cashFlowEntries}
                variations={variations}
              />
            </ChartCard>

            <ChartCard title="Projects by Status">
              <HorizontalBarChart
                data={statusData}
                color={chartColor(SEQUENTIAL_BLUE, theme)}
                formatValue={(v) => String(v)}
              />
            </ChartCard>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TopRisksPanel risks={risks} />
            {recentActivity.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Recent Activity
                </h2>
                <ActivityFeed entries={recentActivity} showProjectLink />
              </div>
            )}
          </div>
        )}

        {activeTab === "trim" && <TrimLinksPanel projects={projects} />}
      </div>

      {showModal && (
        <ProjectFormModal
          project={modalProject}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </AppLayout>
  );
}
