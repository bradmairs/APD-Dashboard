import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CashFlowEntry, Milestone, MonthlyReport, Project } from "../types";
import { getCashFlowEntries, getMilestones, getMonthlyReport, getProject } from "../api";
import { formatCurrency, formatDate, formatReportMonth } from "../format";
import { expenditureToDate as sumExpenditureToDate, forecastAtCompletion } from "../cashflow";
import { HealthRow, NarrativeBlock, ReportField, ReportSection } from "../components/ReportPrimitives";
import { downloadElementAsPdf } from "../pdfExport";
import gvwLogo from "../assets/gvw-logo.png";

export default function MonthlyReportViewPage() {
  const { projectId, reportId } = useParams<{
    projectId: string;
    reportId: string;
  }>();
  const [project, setProject] = useState<Project | null>(null);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [cashFlowEntries, setCashFlowEntries] = useState<CashFlowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  async function handleDownloadPdf() {
    if (!project || !report) return;
    setExportingPdf(true);
    try {
      await downloadElementAsPdf(
        "report-content",
        `${project.name} - Monthly Report - ${formatReportMonth(report.reportingMonth)}`
      );
    } finally {
      setExportingPdf(false);
    }
  }

  useEffect(() => {
    if (!projectId || !reportId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      getProject(projectId),
      getMonthlyReport(reportId),
      getMilestones(projectId),
      getCashFlowEntries(projectId),
    ])
      .then(([projectData, reportData, milestoneData, cashFlowData]) => {
        setProject(projectData);
        setReport(reportData);
        setMilestones(milestoneData);
        setCashFlowEntries(cashFlowData);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load report")
      )
      .finally(() => setLoading(false));
  }, [projectId, reportId]);

  if (loading) {
    return <div className="text-center text-slate-500 py-12">Loading…</div>;
  }

  if (error || !project || !report) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-red-50 text-red-700 text-sm rounded p-3">
          {error || "Report not found"}
        </div>
        <Link
          to="/"
          className="text-blue-600 hover:underline text-sm mt-4 inline-block"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  // Milestones and cash flow are live data (see README) — this view shows
  // them as they stand now, not as they stood in the reporting month.
  const expenditureToDate = sumExpenditureToDate(cashFlowEntries);
  const forecastTotal = forecastAtCompletion(cashFlowEntries);
  const variance =
    project.budget === null ? null : Number(project.budget) - forecastTotal;

  const overallPercent =
    milestones.length === 0
      ? null
      : Math.round(
          milestones.reduce((sum, m) => sum + m.percentComplete, 0) /
            milestones.length
        );

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 print:p-0 print:max-w-none">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Link
            to={`/projects/${project.id}`}
            className="text-sm text-blue-600 hover:underline"
          >
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
            <img
              src={gvwLogo}
              alt="Goulburn Valley Water"
              className="h-14 w-auto"
            />
            <div className="text-right">
              <div className="text-lg font-semibold text-slate-900">
                Monthly Project Report
              </div>
              <div className="text-sm text-slate-500">
                {formatReportMonth(report.reportingMonth)}
              </div>
            </div>
          </div>

          <ReportSection title="Project Information">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <ReportField label="Project Name" value={project.name} />
              <ReportField label="Project Number" value={project.projectNumber || "—"} />
              <ReportField label="BP Ref. No." value={project.bpRefNo || "—"} />
              <ReportField
                label="Project Manager"
                value={project.projectManager || "—"}
              />
              <ReportField
                label="Project Director"
                value={project.projectDirector || "—"}
              />
              <ReportField
                label="Project Sponsor"
                value={project.projectSponsor || "—"}
              />
            </div>
          </ReportSection>

          <ReportSection title="Current Status">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              <ReportField
                label="Reporting Month"
                value={formatReportMonth(report.reportingMonth)}
              />
              <ReportField label="Project Phase" value={report.projectPhase} />
              <ReportField label="Current Status" value={report.currentStatus} />
            </div>
            {report.recentlyCompleted && (
              <NarrativeBlock
                title="Recently Completed"
                text={report.recentlyCompleted}
              />
            )}
            {report.monthlyLookahead && (
              <NarrativeBlock
                title="Monthly Lookahead"
                text={report.monthlyLookahead}
              />
            )}
          </ReportSection>

          <ReportSection title="Cash Flows">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              <ReportField
                label="Original Budget"
                value={formatCurrency(project.budget)}
              />
              {project.latestApprovedBudget !== null && (
                <ReportField
                  label="Latest Approved Budget"
                  value={formatCurrency(project.latestApprovedBudget)}
                />
              )}
              {project.contractValue !== null && (
                <ReportField
                  label="Contract Value"
                  value={formatCurrency(project.contractValue)}
                />
              )}
              <ReportField
                label="Expenditure to Date"
                value={formatCurrency(expenditureToDate)}
              />
              <ReportField
                label="Forecast Total"
                value={formatCurrency(forecastTotal)}
              />
              <ReportField
                label="Variance"
                value={variance === null ? "—" : formatCurrency(variance)}
                negative={variance !== null && variance < 0}
              />
            </div>
            <HealthRow
              label="Budget Health"
              health={report.budgetHealth}
              comments={report.budgetComments}
            />
          </ReportSection>

          <ReportSection title="Schedule / Major Milestones">
            <HealthRow
              label="Schedule Health"
              health={report.scheduleHealth}
              comments={report.scheduleComments}
            />
            {milestones.length === 0 ? (
              <p className="text-sm text-slate-500 mt-3">No milestones recorded.</p>
            ) : (
              <div className="overflow-x-auto mt-3">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-3 font-medium">WBS Item</th>
                      <th className="py-2 pr-3 font-medium">Task / Activity</th>
                      <th className="py-2 pr-3 font-medium">% Complete</th>
                      <th className="py-2 pr-3 font-medium">Original</th>
                      <th className="py-2 pr-3 font-medium">Forecast</th>
                      <th className="py-2 pr-3 font-medium">Actual</th>
                      <th className="py-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {milestones.map((m) => (
                      <tr key={m.id}>
                        <td className="py-2 pr-3 text-slate-500">
                          {m.wbsItem || "—"}
                        </td>
                        <td className="py-2 pr-3 text-slate-900">
                          {m.taskActivity}
                        </td>
                        <td className="py-2 pr-3">{m.percentComplete}%</td>
                        <td className="py-2 pr-3">
                          {formatDate(m.originalCompletion)}
                        </td>
                        <td className="py-2 pr-3">
                          {formatDate(m.forecastedCompletion)}
                        </td>
                        <td className="py-2 pr-3">
                          {formatDate(m.actualCompletion)}
                        </td>
                        <td className="py-2 text-slate-500">{m.notes || ""}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold border-t border-slate-200">
                      <td colSpan={2} className="py-2 pr-3 text-slate-900">
                        Project Completion
                      </td>
                      <td className="py-2 pr-3 text-slate-900">
                        {overallPercent ?? 0}%
                      </td>
                      <td colSpan={4} />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </ReportSection>
        </div>
      </div>
    </div>
  );
}
