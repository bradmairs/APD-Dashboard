import { FormEvent, useState } from "react";
import RichTextArea from "./RichTextArea";
import { SqeCategory, SqeRecord, SqeRecordInput, SqeSeverity, SqeStatus } from "../types";
import {
  ALL_SQE_CATEGORIES,
  ALL_SQE_SEVERITIES,
  ALL_SQE_STATUSES,
  SQE_CATEGORY_LABELS,
  SQE_SEVERITY_LABELS,
  SQE_STATUS_LABELS,
} from "../sqeMeta";

interface Props {
  record: SqeRecord | null;
  onClose: () => void;
  onSave: (data: Partial<SqeRecordInput>) => Promise<void>;
}

function toDateInputValue(value: string | null): string {
  if (!value) return new Date().toISOString().substring(0, 10);
  return value.substring(0, 10);
}

export default function SqeFormModal({ record, onClose, onSave }: Props) {
  const [category, setCategory] = useState<SqeCategory>(record?.category ?? "SAFETY");
  const [severity, setSeverity] = useState<SqeSeverity>(record?.severity ?? "MEDIUM");
  const [title, setTitle] = useState(record?.title ?? "");
  const [description, setDescription] = useState(record?.description ?? "");
  const [correctiveAction, setCorrectiveAction] = useState(record?.correctiveAction ?? "");
  const [dateOccurred, setDateOccurred] = useState(
    toDateInputValue(record?.dateOccurred ?? null)
  );
  const [status, setStatus] = useState<SqeStatus>(record?.status ?? "OPEN");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        category,
        severity,
        title: title.trim(),
        description: description || null,
        correctiveAction: correctiveAction || null,
        dateOccurred: new Date(dateOccurred).toISOString(),
        status,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {record ? "Edit SQE Issue" : "New SQE Issue"}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Title
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Trench collapse near-miss"
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SqeCategory)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {ALL_SQE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {SQE_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as SqeSeverity)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {ALL_SQE_SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {SQE_SEVERITY_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <RichTextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Corrective Action
            </label>
            <RichTextArea
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              rows={2}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Date Occurred
              </label>
              <input
                type="date"
                required
                value={dateOccurred}
                onChange={(e) => setDateOccurred(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SqeStatus)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {ALL_SQE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {SQE_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
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
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
