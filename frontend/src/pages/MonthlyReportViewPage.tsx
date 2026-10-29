import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MonthlyReport, Project } from "../types";
import { getMonthlyReport, getProject } from "../api";
import { formatReportMonth } from "../format";
import { downloadElementAsPdf } from "../pdfExport";
import MonthlyReportSheet from "../monthlyReport/MonthlyReportSheet";

// Print/PDF view of one month's report, laid out like the workbook's
// "Monthly Report" tab. Editing happens on the project's Monthly Reporting tab.
export default function MonthlyReportViewPage() {
  const { projectId, reportId } = useParams<{
    projectId: string;
    reportId: string;
  }>();
  const [project, setProject] = useState<Project | null>(null);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  async function handleDownloadPdf() {
    if (!project || !report) return;
    setExportingPdf(true);
    try {
      await downloadElementAsPdf(
        "report-content",
        `Monthly Report - ${project.name} - ${formatReportMonth(report.reportingMonth)}`
      );
    } finally {
      setExportingPdf(false);
    }
  }

  useEffect(() => {
    if (!projectId || !reportId) return;
    setLoading(true);
    setError(null);
    Promise.all([getProject(projectId), getMonthlyReport(reportId)])
      .then(([projectData, reportData]) => {
        setProject(projectData);
        setReport(reportData);
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 print:bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 print:p-0 print:max-w-none">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Link
            to={`/projects/${project.id}?tab=monthly-reporting`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to {project.name}
          </Link>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={exportingPdf}
              className="px-4 py-2 text-sm rounded border border-slate-300 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
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

        <div id="report-content">
          <MonthlyReportSheet content={report.content} reportingMonth={report.reportingMonth.slice(0, 7)} />
        </div>
      </div>
    </div>
  );
}
