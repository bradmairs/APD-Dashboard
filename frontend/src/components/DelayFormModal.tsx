import { FormEvent, useState } from "react";
import { Delay, DelayInput, DelayStatus } from "../types";
import {
  ALL_DELAY_STATUSES,
  DELAY_CATEGORY_SUGGESTIONS,
  DELAY_RESPONSIBLE_SUGGESTIONS,
  DELAY_STATUS_LABELS,
} from "../delayMeta";

interface Props {
  delay: Delay | null;
  onClose: () => void;
  onSave: (data: Partial<DelayInput>) => Promise<void>;
}

function toDateInputValue(value: string | null, fallbackToday: boolean): string {
  if (!value) return fallbackToday ? new Date().toISOString().substring(0, 10) : "";
  return value.substring(0, 10);
}

const inputClass =
  "w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm";
const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

export default function DelayFormModal({ delay, onClose, onSave }: Props) {
  const [title, setTitle] = useState(delay?.title ?? "");
  const [category, setCategory] = useState(delay?.category ?? "");
  const [description, setDescription] = useState(delay?.description ?? "");
  const [responsibleParty, setResponsibleParty] = useState(delay?.responsibleParty ?? "");
  const [criticalPath, setCriticalPath] = useState(delay?.criticalPath ?? false);
  const [dateStarted, setDateStarted] = useState(toDateInputValue(delay?.dateStarted ?? null, true));
  const [dateEnded, setDateEnded] = useState(toDateInputValue(delay?.dateEnded ?? null, false));
  const [daysImpact, setDaysImpact] = useState(
    delay?.daysImpact !== null && delay?.daysImpact !== undefined ? String(delay.daysImpact) : ""
  );
  const [status, setStatus] = useState<DelayStatus>(delay?.status ?? "ONGOING");
  const [mitigation, setMitigation] = useState(delay?.mitigation ?? "");
  const [eotReference, setEotReference] = useState(delay?.eotReference ?? "");
  const [notes, setNotes] = useState(delay?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (dateEnded && dateEnded < dateStarted) {
      setError("The end date cannot be before the start date.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        category: category || null,
        description: description || null,
        responsibleParty: responsibleParty || null,
        criticalPath,
        dateStarted: new Date(dateStarted).toISOString(),
        dateEnded: dateEnded ? new Date(dateEnded).toISOString() : null,
        daysImpact: daysImpact === "" ? null : Number(daysImpact),
        status,
        mitigation: mitigation || null,
        eotReference: eotReference || null,
        notes: notes || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save delay");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {delay ? "Edit Delay" : "Log Delay"}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
              {error}
            </div>
          )}

          <div>
            <label className={labelClass}>Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Switchboard delivery slipped"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className={labelClass}>Cause / Category</label>
              <input
                list="delay-category-suggestions"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Weather"
                className={inputClass}
              />
              <datalist id="delay-category-suggestions">
                {DELAY_CATEGORY_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="min-w-0">
              <label className={labelClass}>Responsible Party</label>
              <input
                list="delay-responsible-suggestions"
                value={responsibleParty}
                onChange={(e) => setResponsibleParty(e.target.value)}
                placeholder="e.g. Contractor"
                className={inputClass}
              />
              <datalist id="delay-responsible-suggestions">
                {DELAY_RESPONSIBLE_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label className={labelClass}>Date Started</label>
              <input
                type="date"
                required
                value={dateStarted}
                onChange={(e) => setDateStarted(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="min-w-0">
              <label className={labelClass}>Date Ended</label>
              <input
                type="date"
                value={dateEnded}
                onChange={(e) => setDateEnded(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="min-w-0">
              <label className={labelClass}>Days Delayed</label>
              <input
                type="number"
                min={0}
                value={daysImpact}
                onChange={(e) => setDaysImpact(e.target.value)}
                placeholder="Auto from dates"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DelayStatus)}
                className={inputClass}
              >
                {ALL_DELAY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {DELAY_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Related EOT Claim</label>
              <input
                value={eotReference}
                onChange={(e) => setEotReference(e.target.value)}
                placeholder="e.g. EOT-01"
                className={inputClass}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={criticalPath}
              onChange={(e) => setCriticalPath(e.target.checked)}
              className="h-4 w-4"
            />
            Affects the critical path (pushes out the completion date)
          </label>

          <div>
            <label className={labelClass}>Mitigation / Recovery Action</label>
            <textarea
              value={mitigation}
              onChange={(e) => setMitigation(e.target.value)}
              rows={2}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} />
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
