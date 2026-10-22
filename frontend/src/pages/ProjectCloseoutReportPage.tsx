import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CashFlowEntry,
  ChecklistItem,
  DefectItem,
  EotClaim,
  LessonLearned,
  Milestone,
  Project,
  Rfi,
  Variation,
} from "../types";
import {
  getCashFlowEntries,
  getChecklistItems,
  getDefects,
  getEotClaims,
  getLessonsLearned,
  getMilestones,
  getProject,
  getRfis,
  getVariations,
} from "../api";
import { formatCurrency, formatDate } from "../format";
import { approvedVariationsTotal, revisedBudget } from "../variations";
import { approvedEotDaysTotal, revisedCompletionDate } from "../eot";
import { VARIATION_STATUS_COLORS, VARIATION_STATUS_LABELS } from "../variationMeta";
import { EOT_STATUS_COLORS, EOT_STATUS_LABELS } from "../eotMeta";
import { CHECKLIST_STATUS_COLORS, CHECKLIST_STATUS_LABELS } from "../checklistMeta";
import { DEFECT_STATUS_COLORS, DEFECT_STATUS_LABELS } from "../defectMeta";
import { RFI_STATUS_COLORS, RFI_STATUS_LABELS } from "../rfiMeta";
import { LESSON_TYPE_COLORS, LESSON_TYPE_LABELS } from "../lessonMeta";
import { NarrativeBlock, ReportField, ReportSection } from "../components/ReportPrimitives";
import { downloadElementAsPdf } from "../pdfExport";
import gvwLogo from "../assets/gvw-logo.png";

export default function ProjectCloseoutReportPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [eotClaims, setEotClaims] = useState<EotClaim[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [defects, setDefects] = useState<DefectItem[]>([]);
  const [rfis, setRfis] = useState<Rfi[]>([]);
  const [lessons, setLessons] = useState<LessonLearned[]>([]);
  const [cashFlowEntries, setCashFlowEntries] = useState<CashFlowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  async function handleDownloadPdf() {
    if (!project) return;
    setExportingPdf(true);
    try {
      await downloadElementAsPdf("report-content", `${project.name} - Closeout Report`);
    } finally {
      setExportingPdf(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([
      getProject(id),
      getMilestones(id),
      getVariations(id),
      getEotClaims(id),
      getChecklistItems(id),
      getDefects(id),
      getRfis(id),
      getLessonsLearned(id),
      getCashFlowEntries(id),
    ])
      .then(
        ([
          projectData,
          milestoneData,
          variationData,
          eotData,
          checklistData,
          defectData,
          rfiData,
          lessonData,
          cashFlowData,
        ]) => {
          setProject(projectData);
          setMilestones(milestoneData);
          setVariations(variationData);
          setEotClaims(eotData);
          // Procurement checklist items belong to the Procurement tab, not closeout.
          setChecklistItems(checklistData.filter((c) => c.phase !== "PROCUREMENT"));
          setDefects(defectData);
          setRfis(rfiData);
          setLessons(lessonData);
          setCashFlowEntries(cashFlowData);
        }
      )
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load report"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="text-center text-slate-500 py-12">Loading…</div>;
  }

  if (error || !project) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-red-50 text-red-700 text-sm rounded p-3">
          {error || "Project not found"}
        </div>
        <Link to="/" className="text-blue-600 hover:underline text-sm mt-4 inline-block">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const finalBudget = revisedBudget(project, variations);
  const variationsTotal = approvedVariationsTotal(variations);
  const finalCompletionDate = revisedCompletionDate(project, eotClaims);
  const eotDaysTotal = approvedEotDaysTotal(eotClaims);
  const finalExpenditure = cashFlowEntries
    .filter((e) => e.type === "ACTUAL")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const budgetVariance = finalBudget === null ? null : finalBudget - finalExpenditure;

  const overallMilestonePercent =
    milestones.length === 0
      ? null
      : Math.round(milestones.reduce((sum, m) => sum + m.percentComplete, 0) / milestones.length);

  const outstandingChecklistItems = checklistItems.filter(
    (c) => c.status !== "COMPLETE" && c.status !== "NOT_APPLICABLE"
  );
  const checklistCompletePercent =
    checklistItems.length === 0
      ? null
      : Math.round(
          (checklistItems.filter((c) => c.status === "COMPLETE" || c.status === "NOT_APPLICABLE")
            .length /
            checklistItems.length) *
            100
        );

  const outstandingDefects = defects.filter((d) => d.status === "OPEN" || d.status === "DISPUTED");
  const outstandingRfis = rfis.filter((r) => r.status !== "CLOSED");

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 print:p-0 print:max-w-none">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Link to={`/projects/${project.id}`} className="text-sm text-blue-600 hover:underline">
            ← Back to {project.name}
          </Link>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={exportingPdf}
              className="px-4 py-2 text-sm rounded border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {exportingPdf ? "Generating…" : "Download PDF"}
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Print
            </button>
          </div>
        </div>

        <div id="report-content" className="bg-white border border-slate-200 rounded-lg p-6 print:border-0 print:p-0">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
            <img src={gvwLogo} alt="Goulburn Valley Water" className="h-14 w-auto" />
            <div className="text-right">
              <div className="text-lg font-semibold text-slate-900">Project Closeout Report</div>
              <div className="text-sm text-slate-500">Generated {formatDate(new Date().toISOString())}</div>
            </div>
          </div>

          <ReportSection title="Project Information">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <ReportField label="Project Name" value={project.name} />
              <ReportField label="Project Number" value={project.projectNumber || "—"} />
              <ReportField label="BP Ref. No." value={project.bpRefNo || "—"} />
              <ReportField label="Asset Type" value={project.assetType || "—"} />
              <ReportField label="Contractor" value={project.contractor || "—"} />
              <ReportField label="Consultant" value={project.consultant || "—"} />
              <ReportField label="TRIM Folder" value={project.trimFolder || "—"} />
              <ReportField label="Project Manager" value={project.projectManager || "—"} />
              <ReportField label="Project Director" value={project.projectDirector || "—"} />
              <ReportField label="Project Sponsor" value={project.projectSponsor || "—"} />
              <ReportField label="Location" value={project.location || "—"} />
              <ReportField label="Start Date" value={formatDate(project.startDate)} />
            </div>
          </ReportSection>

          <ReportSection title="Final Budget Outcome">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              <ReportField label="Original Budget" value={formatCurrency(project.budget)} />
              {project.latestApprovedBudget !== null && (
                <ReportField
                  label="Latest Approved Budget"
                  value={formatCurrency(project.latestApprovedBudget)}
                />
              )}
              <ReportField label="Approved Variations" value={formatCurrency(variationsTotal)} />
              <ReportField label="Final Budget" value={formatCurrency(finalBudget)} />
              <ReportField label="Final Expenditure" value={formatCurrency(finalExpenditure)} />
              <ReportField
                label="Variance"
                value={budgetVariance === null ? "—" : formatCurrency(budgetVariance)}
                negative={budgetVariance !== null && budgetVariance < 0}
              />
              <ReportField label="Contract Value" value={formatCurrency(project.contractValue)} />
            </div>
            {variations.length === 0 ? (
              <p className="text-sm text-slate-500">No variations recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-3 font-medium">Reference</th>
                      <th className="py-2 pr-3 font-medium">Title</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 font-medium">Cost Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {variations.map((v) => (
                      <tr key={v.id}>
                        <td className="py-2 pr-3 text-slate-500">{v.reference || "—"}</td>
                        <td className="py-2 pr-3 text-slate-900">{v.title}</td>
                        <td className="py-2 pr-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${VARIATION_STATUS_COLORS[v.status]}`}>
                            {VARIATION_STATUS_LABELS[v.status]}
                          </span>
                        </td>
                        <td className="py-2">{formatCurrency(v.costImpact)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ReportSection>

          <ReportSection title="Final Schedule Outcome">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              <ReportField label="Original Target Completion" value={formatDate(project.targetCompletionDate)} />
              <ReportField label="Approved EOT Days" value={String(eotDaysTotal)} />
              <ReportField label="Revised Target Completion" value={formatDate(finalCompletionDate)} />
              <ReportField label="Actual Completion" value={formatDate(project.actualCompletionDate)} />
              <ReportField label="Overall Milestone Completion" value={overallMilestonePercent === null ? "—" : `${overallMilestonePercent}%`} />
            </div>
            {eotClaims.length === 0 ? (
              <p className="text-sm text-slate-500">No extension of time claims recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-3 font-medium">Reference</th>
                      <th className="py-2 pr-3 font-medium">Title</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 font-medium">Days Granted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {eotClaims.map((c) => (
                      <tr key={c.id}>
                        <td className="py-2 pr-3 text-slate-500">{c.reference || "—"}</td>
                        <td className="py-2 pr-3 text-slate-900">{c.title}</td>
                        <td className="py-2 pr-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${EOT_STATUS_COLORS[c.status]}`}>
                            {EOT_STATUS_LABELS[c.status]}
                          </span>
                        </td>
                        <td className="py-2">{c.status === "APPROVED" ? c.daysGranted ?? c.daysClaimed : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ReportSection>

          <ReportSection title="Commissioning &amp; Handover">
            <ReportField
              label="Checklist Completion"
              value={checklistCompletePercent === null ? "No checklist items recorded" : `${checklistCompletePercent}%`}
            />
            {outstandingChecklistItems.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-medium text-slate-500 mb-1">
                  Outstanding Items ({outstandingChecklistItems.length})
                </div>
                <ul className="divide-y divide-slate-100">
                  {outstandingChecklistItems.map((c) => (
                    <li key={c.id} className="py-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-900">{c.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${CHECKLIST_STATUS_COLORS[c.status]}`}>
                        {CHECKLIST_STATUS_LABELS[c.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </ReportSection>

          <ReportSection title="Defects &amp; Punch List">
            <ReportField label="Outstanding Defects" value={String(outstandingDefects.length)} />
            {outstandingDefects.length === 0 ? (
              <p className="text-sm text-slate-500 mt-3">No outstanding defects.</p>
            ) : (
              <ul className="divide-y divide-slate-100 mt-3">
                {outstandingDefects.map((d) => (
                  <li key={d.id} className="py-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-900">
                      {d.title}
                      {d.location && <span className="text-slate-500"> — {d.location}</span>}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${DEFECT_STATUS_COLORS[d.status]}`}>
                      {DEFECT_STATUS_LABELS[d.status]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ReportSection>

          <ReportSection title="Outstanding RFIs">
            <ReportField label="Open RFIs" value={String(outstandingRfis.length)} />
            {outstandingRfis.length === 0 ? (
              <p className="text-sm text-slate-500 mt-3">No outstanding RFIs.</p>
            ) : (
              <ul className="divide-y divide-slate-100 mt-3">
                {outstandingRfis.map((r) => (
                  <li key={r.id} className="py-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-900">
                      {r.rfiNumber}: {r.subject}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${RFI_STATUS_COLORS[r.status]}`}>
                      {RFI_STATUS_LABELS[r.status]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ReportSection>

          <ReportSection title="Lessons Learned">
            {lessons.length === 0 ? (
              <p className="text-sm text-slate-500">No lessons learned recorded.</p>
            ) : (
              <div className="space-y-3">
                {lessons.map((l) => (
                  <div key={l.id} className="border border-slate-100 rounded p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${LESSON_TYPE_COLORS[l.type]}`}>
                        {LESSON_TYPE_LABELS[l.type]}
                      </span>
                      <span className="text-sm font-medium text-slate-900">{l.title}</span>
                    </div>
                    {l.description && <NarrativeBlock title="Description" text={l.description} />}
                    {l.recommendation && <NarrativeBlock title="Recommendation" text={l.recommendation} />}
                  </div>
                ))}
              </div>
            )}
          </ReportSection>
        </div>
      </div>
    </div>
  );
}
