import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTabParam } from "../useTabParam";
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
  askPortfolioAi,
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
import AiAssistantPanel from "../components/AiAssistantPanel";
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
import UserMenu from "../components/UserMenu";
import Tabs from "../components/Tabs";
import { useAuth } from "../auth/AuthContext";
import GvwLogo from "../components/GvwLogo";
import { APP_VERSION } from "../version";
import ExportCsvButton from "../components/ExportCsvButton";
import { formatCurrency, formatDate } from "../format";
import { DashboardView, addSavedView, loadSavedViews, removeSavedView } from "../savedViews";
import { RagStatus } from "../types";
import { useUndoToast } from "../undo/UndoToastContext";
import { useConfirm } from "../confirm/ConfirmContext";

const RAG_LABELS: Record<RagStatus, string> = { GREEN: "Green", AMBER: "Amber", RED: "Red" };

type DashboardTabId = "projects" | "today" | "alerts" | "charts" | "activity" | "ai";

const DASHBOARD_TABS: { id: DashboardTabId; label: string }[] = [
  { id: "projects", label: "Projects" },
  { id: "today", label: "Today & Upcoming" },
  { id: "alerts", label: "Alerts" },
  { id: "charts", label: "Charts" },
  { id: "activity", label: "Activity" },
  { id: "ai", label: "AI Assistant" },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isViewer } = useAuth();
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
      ] = await Promise.all([
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
      ]);
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
      hasLoadedRef.current = true;
    } catch (err) {
      if (initial) setError(err instanceof Error ? err.message : "Failed to load data");
      else console.error("Background refresh failed", err);
    } finally {
      if (initial) setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

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
        const haystack = `${p.name} ${p.location ?? ""} ${
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

  async function handleCompleteAction(actionItem: ActionItem) {
    await updateActionItem(actionItem.id, { status: "DONE" });
    await loadData();
  }

  async function handleUpdateActionDueDate(actionItem: ActionItem, dueDate: string | null) {
    await updateActionItem(actionItem.id, { dueDate });
    await loadData();
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-y-3">
          <Link to="/" className="flex items-center gap-4 hover:opacity-90">
            <GvwLogo className="h-16" />
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                APD Project Management Dashboard
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Water Authority
                <span
                  className="ml-2 text-xs text-slate-400 dark:text-slate-500"
                  title={`APD Project Management Dashboard version ${APP_VERSION}`}
                >
                  v{APP_VERSION}
                </span>
              </p>
            </div>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/lessons-learned"
              className="px-4 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Lessons Learned
            </Link>
            <Link
              to="/reports"
              className="px-4 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Reports
            </Link>
            {!isViewer && (
              <button
                onClick={openNewProject}
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                + New Project
              </button>
            )}
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-3">
            {error}
          </div>
        )}

        <StatCards
          projects={projects}
          variations={variations}
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

        <Tabs tabs={DASHBOARD_TABS} active={activeTab} onChange={setActiveTab} />

        {activeTab === "projects" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-3 py-1.5 text-sm rounded-full border ${
                    statusFilter === "ALL"
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600"
                  }`}
                >
                  All
                </button>
                {ALL_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 text-sm rounded-full border ${
                      statusFilter === s
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, location, manager…"
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
                  { header: "BP Ref No.", key: "bpRefNo" },
                  { header: "Manager", key: "manager" },
                  { header: "Director", key: "director" },
                  { header: "Sponsor", key: "sponsor" },
                  { header: "Location", key: "location" },
                  { header: "Contractor", key: "contractor" },
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
                  bpRefNo: p.bpRefNo ?? "",
                  manager: p.projectManager ?? "",
                  director: p.projectDirector ?? "",
                  sponsor: p.projectSponsor ?? "",
                  location: p.location ?? "",
                  contractor: p.contractor ?? "",
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

            {loading ? (
              <div className="text-center text-slate-500 dark:text-slate-400 py-12">
                Loading…
              </div>
            ) : (
              <ProjectTable
                projects={filteredProjects}
                currentUser={user}
                healthByProjectId={healthByProjectId}
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
        )}

        {activeTab === "today" && !loading && (
          <TodayAndUpcomingPanel
            tasks={upcomingTasks}
            actionItems={actionItems}
            onCompleteTask={handleCompleteTask}
            onCompleteAction={handleCompleteAction}
            onUpdateTaskDueDate={handleUpdateTaskDueDate}
              onUpdateActionDueDate={handleUpdateActionDueDate}
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

        {activeTab === "ai" && (
          <AiAssistantPanel
            title="AI Assistant"
            description="Ask questions across the whole portfolio — budgets, schedules, risks, and open items across every project. Powered by a locally-hosted Ollama model."
            suggestedQuestion="Which projects need attention right now, and why?"
            onAsk={askPortfolioAi}
          />
        )}
      </main>

      {showModal && (
        <ProjectFormModal
          project={modalProject}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
