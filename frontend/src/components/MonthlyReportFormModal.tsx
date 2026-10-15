import { FormEvent, useState } from "react";
import { MonthlyReport, MonthlyReportInput, RagStatus } from "../types";
import { ALL_RAG_STATUSES, RAG_LABELS } from "../ragMeta";

interface Props {
  report: MonthlyReport | null;
  onClose: () => void;
  onSave: (data: Partial<MonthlyReportInput>) => Promise<void>;
}

function toMonthInputValue(value: string | null): string {
  if (!value) return "";
  return value.substring(0, 7);
}

const PHASE_SUGGESTIONS = [
  "1 - Identify",
  "2 - Investigate",
  "3 - Plan",
  "4 - Design",
  "5 - Procure",
  "6 - Deliver",
  "7 - Finalise",
];

export default function MonthlyReportFormModal({ report, onClose, onSave }: Props) {
  const [reportingMonth, setReportingMonth] = useState(
    toMonthInputValue(report?.reportingMonth ?? null)
  );
  const [projectPhase, setProjectPhase] = useState(report?.projectPhase ?? "");
  const [currentStatus, setCurrentStatus] = useState(report?.currentStatus ?? "");
  const [recentlyCompleted, setRecentlyCompleted] = useState(
    report?.recentlyCompleted ?? ""
  );
  const [monthlyLookahead, setMonthlyLookahead] = useState(
    report?.monthlyLookahead ?? ""
  );
  const [budgetHealth, setBudgetHealth] = useState<RagStatus>(
    report?.budgetHealth ?? "GREEN"
  );
  const [budgetComments, setBudgetComments] = useState(report?.budgetComments ?? "");
  const [scheduleHealth, setScheduleHealth] = useState<RagStatus>(
    report?.scheduleHealth ?? "GREEN"
  );
  const [scheduleComments, setScheduleComments] = useState(
    report?.scheduleComments ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        reportingMonth,
        projectPhase,
        currentStatus,
        recentlyCompleted: recentlyCompleted || null,
        monthlyLookahead: monthlyLookahead || null,
        budgetHealth,
        budgetComments: budgetComments || null,
        scheduleHealth,
        scheduleComments: scheduleComments || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save report");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {report ? "Edit Monthly Report" : "New Monthly Report"}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reporting Month
              </label>
              <input
                type="month"
                required
                value={reportingMonth}
                onChange={(e) => setReportingMonth(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Project Phase
              </label>
              <input
                required
                list="phase-suggestions"
                value={projectPhase}
                onChange={(e) => setProjectPhase(e.target.value)}
                placeholder="e.g. 3 - Plan"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
              <datalist id="phase-suggestions">
                {PHASE_SUGGESTIONS.map((phase) => (
                  <option key={phase} value={phase} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Current Status
            </label>
            <input
              required
              value={currentStatus}
              onChange={(e) => setCurrentStatus(e.target.value)}
              placeholder="e.g. Concept Design"
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Recently Completed
            </label>
            <textarea
              value={recentlyCompleted}
              onChange={(e) => setRecentlyCompleted(e.target.value)}
              rows={3}
              placeholder={"One point per line, e.g.\n• Survey completed at both sites."}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Monthly Lookahead
            </label>
            <textarea
              value={monthlyLookahead}
              onChange={(e) => setMonthlyLookahead(e.target.value)}
              rows={3}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Budget Health
              </label>
              <select
                value={budgetHealth}
                onChange={(e) => setBudgetHealth(e.target.value as RagStatus)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {ALL_RAG_STATUSES.map((rag) => (
                  <option key={rag} value={rag}>
                    {RAG_LABELS[rag]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Schedule Health
              </label>
              <select
                value={scheduleHealth}
                onChange={(e) => setScheduleHealth(e.target.value as RagStatus)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {ALL_RAG_STATUSES.map((rag) => (
                  <option key={rag} value={rag}>
                    {RAG_LABELS[rag]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Budget Comments
            </label>
            <textarea
              value={budgetComments}
              onChange={(e) => setBudgetComments(e.target.value)}
              rows={2}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Schedule Comments
            </label>
            <textarea
              value={scheduleComments}
              onChange={(e) => setScheduleComments(e.target.value)}
              rows={2}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
