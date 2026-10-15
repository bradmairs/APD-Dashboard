import { useState } from "react";
import { Link } from "react-router-dom";
import { MonthlyReport, MonthlyReportInput, User } from "../types";
import { RAG_COLORS, RAG_LABELS } from "../ragMeta";
import { formatReportMonth } from "../format";
import { canModifyReport } from "../permissions";
import MonthlyReportFormModal from "./MonthlyReportFormModal";
import { useConfirm } from "../confirm/ConfirmContext";

interface Props {
  reports: MonthlyReport[];
  currentUser: User | null;
  onCreate: (data: Partial<MonthlyReportInput>) => Promise<void>;
  onUpdate: (
    report: MonthlyReport,
    data: Partial<MonthlyReportInput>
  ) => Promise<void>;
  onDelete: (report: MonthlyReport) => Promise<void>;
}

export default function MonthlyReportsPanel({
  reports,
  currentUser,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MonthlyReport | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(report: MonthlyReport) {
    setEditing(report);
    setShowModal(true);
  }

  async function handleSave(data: Partial<MonthlyReportInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(report: MonthlyReport) {
    if (
      !await confirm(
        `Delete the ${formatReportMonth(report.reportingMonth)} report? This cannot be undone.`
      )
    )
      return;
    await onDelete(report);
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Monthly Reports
        </h2>
        <button
          onClick={openCreate}
          className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          + New Report
        </button>
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No monthly reports yet.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {reports.map((report) => {
            const canModify = canModifyReport(report, currentUser);
            const isExpanded = expandedId === report.id;
            return (
              <li key={report.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : report.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {formatReportMonth(report.reportingMonth)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {report.projectPhase} · {report.currentStatus}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${RAG_COLORS[report.budgetHealth]}`}
                      >
                        Budget: {RAG_LABELS[report.budgetHealth]}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${RAG_COLORS[report.scheduleHealth]}`}
                      >
                        Schedule: {RAG_LABELS[report.scheduleHealth]}
                      </span>
                    </div>
                  </button>
                  <div className="flex items-center gap-3 shrink-0 pt-0.5">
                    <Link
                      to={`/projects/${report.projectId}/reports/${report.id}`}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View
                    </Link>
                    {canModify && (
                      <>
                        <button
                          onClick={() => openEdit(report)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(report)}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-3 text-sm">
                    {report.recentlyCompleted && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Recently Completed
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {report.recentlyCompleted}
                        </p>
                      </div>
                    )}
                    {report.monthlyLookahead && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Monthly Lookahead
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {report.monthlyLookahead}
                        </p>
                      </div>
                    )}
                    {report.budgetComments && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Budget Comments
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">
                          {report.budgetComments}
                        </p>
                      </div>
                    )}
                    {report.scheduleComments && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          Schedule Comments
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">
                          {report.scheduleComments}
                        </p>
                      </div>
                    )}
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      Reported by {report.authorName}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showModal && (
        <MonthlyReportFormModal
          report={editing}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
