import { FormEvent, useState } from "react";
import RichTextArea from "./RichTextArea";
import { ActionItem, ActionItemInput, ActionItemStatus, ActionType } from "../types";
import {
  ALL_ACTION_STATUSES,
  ALL_ACTION_TYPES,
  ACTION_STATUS_LABELS,
  ACTION_TYPE_LABELS,
} from "../actionItemMeta";

interface Props {
  actionItem: ActionItem | null;
  onClose: () => void;
  onSave: (data: Partial<ActionItemInput>) => Promise<void>;
}

function toDateInputValue(value: string | null): string {
  if (!value) return new Date().toISOString().substring(0, 10);
  return value.substring(0, 10);
}

const CATEGORY_SUGGESTIONS = [
  "Design Review",
  "Site Meeting",
  "Client Meeting",
  "Contractor Coordination",
  "Internal",
];

export default function ActionItemFormModal({ actionItem, onClose, onSave }: Props) {
  const [type, setType] = useState<ActionType>(actionItem?.type ?? "ACTION");
  const [title, setTitle] = useState(actionItem?.title ?? "");
  const [category, setCategory] = useState(actionItem?.category ?? "");
  const [description, setDescription] = useState(actionItem?.description ?? "");
  const [ownerName, setOwnerName] = useState(actionItem?.ownerName ?? "");
  const [dueDate, setDueDate] = useState(
    actionItem?.dueDate ? actionItem.dueDate.substring(0, 10) : ""
  );
  const [status, setStatus] = useState<ActionItemStatus>(
    actionItem?.status ?? (type === "DECISION" ? "DONE" : "OPEN")
  );
  const [dateRaised, setDateRaised] = useState(
    toDateInputValue(actionItem?.dateRaised ?? null)
  );
  const [notes, setNotes] = useState(actionItem?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleTypeChange(next: ActionType) {
    setType(next);
    // Switching to Decision on a fresh entry defaults it to already-decided,
    // matching how the backend defaults a newly-created decision.
    if (!actionItem) {
      setStatus(next === "DECISION" ? "DONE" : "OPEN");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        type,
        title: title.trim(),
        category: category || null,
        description: description || null,
        ownerName: ownerName || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        status,
        dateRaised: new Date(dateRaised).toISOString(),
        notes: notes || null,
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
            {actionItem ? "Edit Action / Decision" : "New Action / Decision"}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Title
              </label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Confirm valve spec with supplier"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as ActionType)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {ALL_ACTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ACTION_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <input
              list="action-category-suggestions"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Site Meeting"
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
            <datalist id="action-category-suggestions">
              {CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Owner
              </label>
              <input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Optional"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Date Raised
              </label>
              <input
                type="date"
                required
                value={dateRaised}
                onChange={(e) => setDateRaised(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ActionItemStatus)}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            >
              {ALL_ACTION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ACTION_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
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
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
