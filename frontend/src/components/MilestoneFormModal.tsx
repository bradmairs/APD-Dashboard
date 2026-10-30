import { FormEvent, useState } from "react";
import RichTextArea from "./RichTextArea";
import { Milestone, MilestoneInput } from "../types";

interface Props {
  milestone: Milestone | null;
  onClose: () => void;
  onSave: (data: Partial<MilestoneInput>) => Promise<void>;
}

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  return value.substring(0, 10);
}

export default function MilestoneFormModal({ milestone, onClose, onSave }: Props) {
  const [wbsItem, setWbsItem] = useState(milestone?.wbsItem ?? "");
  const [taskActivity, setTaskActivity] = useState(milestone?.taskActivity ?? "");
  const [percentComplete, setPercentComplete] = useState(
    milestone?.percentComplete ?? 0
  );
  const [startDate, setStartDate] = useState(
    toDateInputValue(milestone?.startDate ?? null)
  );
  const [originalCompletion, setOriginalCompletion] = useState(
    toDateInputValue(milestone?.originalCompletion ?? null)
  );
  const [forecastedCompletion, setForecastedCompletion] = useState(
    toDateInputValue(milestone?.forecastedCompletion ?? null)
  );
  const [actualCompletion, setActualCompletion] = useState(
    toDateInputValue(milestone?.actualCompletion ?? null)
  );
  const [notes, setNotes] = useState(milestone?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        wbsItem: wbsItem || null,
        taskActivity,
        percentComplete: Number(percentComplete),
        startDate: startDate ? new Date(startDate).toISOString() : null,
        originalCompletion: originalCompletion
          ? new Date(originalCompletion).toISOString()
          : null,
        forecastedCompletion: forecastedCompletion
          ? new Date(forecastedCompletion).toISOString()
          : null,
        actualCompletion: actualCompletion
          ? new Date(actualCompletion).toISOString()
          : null,
        notes: notes || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save milestone");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {milestone ? "Edit Milestone" : "New Milestone"}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Task / Activity
              </label>
              <input
                required
                value={taskActivity}
                onChange={(e) => setTaskActivity(e.target.value)}
                placeholder="e.g. Concept Design"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                WBS Item
              </label>
              <input
                value={wbsItem}
                onChange={(e) => setWbsItem(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Percentage Completed
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={percentComplete}
                onChange={(e) => setPercentComplete(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300 w-12 text-right">
                {percentComplete}%
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Optional — leave blank to have this milestone start when the
              previous one ends. Set a date if it starts early, overlaps, or
              runs at the same time as another milestone.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Original Completion
              </label>
              <input
                type="date"
                value={originalCompletion}
                onChange={(e) => setOriginalCompletion(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Forecasted Completion
              </label>
              <input
                type="date"
                value={forecastedCompletion}
                onChange={(e) => setForecastedCompletion(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Actual Completion
              </label>
              <input
                type="date"
                value={actualCompletion}
                onChange={(e) => setActualCompletion(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notes
            </label>
            <RichTextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              {saving ? "Saving…" : "Save Milestone"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
