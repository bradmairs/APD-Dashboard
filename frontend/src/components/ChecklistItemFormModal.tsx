import { FormEvent, useState } from "react";
import RichTextArea from "./RichTextArea";
import { ChecklistItem, ChecklistItemInput, ChecklistItemStatus, ChecklistPhase } from "../types";
import {
  ALL_CHECKLIST_PHASES,
  ALL_CHECKLIST_STATUSES,
  CHECKLIST_PHASE_LABELS,
  CHECKLIST_STATUS_LABELS,
} from "../checklistMeta";

interface Props {
  item: ChecklistItem | null;
  defaultPhase?: ChecklistPhase;
  // Phases offered in the Phase dropdown (defaults to all).
  phases?: ChecklistPhase[];
  onClose: () => void;
  onSave: (data: Partial<ChecklistItemInput>) => Promise<void>;
}

function toDateInputValue(value: string | null): string {
  return value ? value.substring(0, 10) : "";
}

export default function ChecklistItemFormModal({
  item,
  defaultPhase,
  phases = ALL_CHECKLIST_PHASES,
  onClose,
  onSave,
}: Props) {
  const [phase, setPhase] = useState<ChecklistPhase>(
    item?.phase ?? defaultPhase ?? phases[0]
  );
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [responsible, setResponsible] = useState(item?.responsible ?? "");
  const [dueDate, setDueDate] = useState(toDateInputValue(item?.dueDate ?? null));
  const [status, setStatus] = useState<ChecklistItemStatus>(item?.status ?? "NOT_STARTED");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        phase,
        title: title.trim(),
        description: description || null,
        responsible: responsible || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        status,
        notes: notes || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save checklist item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {item ? "Edit Checklist Item" : "New Checklist Item"}
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
                placeholder="e.g. Functional test of SCADA integration"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Phase
              </label>
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value as ChecklistPhase)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {phases.map((p) => (
                  <option key={p} value={p}>
                    {CHECKLIST_PHASE_LABELS[p]}
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Responsible
              </label>
              <input
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
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
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ChecklistItemStatus)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {ALL_CHECKLIST_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {CHECKLIST_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
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
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
