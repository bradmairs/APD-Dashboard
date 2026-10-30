import { FormEvent, useState } from "react";
import RichTextArea from "./RichTextArea";
import { EotClaim, EotClaimInput, EotStatus } from "../types";
import { ALL_EOT_STATUSES, EOT_CAUSE_SUGGESTIONS, EOT_STATUS_LABELS } from "../eotMeta";

interface Props {
  claim: EotClaim | null;
  onClose: () => void;
  onSave: (data: Partial<EotClaimInput>) => Promise<void>;
}

function toDateInputValue(value: string | null): string {
  if (!value) return new Date().toISOString().substring(0, 10);
  return value.substring(0, 10);
}

export default function EotClaimFormModal({ claim, onClose, onSave }: Props) {
  const [reference, setReference] = useState(claim?.reference ?? "");
  const [title, setTitle] = useState(claim?.title ?? "");
  const [cause, setCause] = useState(claim?.cause ?? "");
  const [description, setDescription] = useState(claim?.description ?? "");
  const [daysClaimed, setDaysClaimed] = useState(
    claim?.daysClaimed !== undefined ? String(claim.daysClaimed) : ""
  );
  const [daysGranted, setDaysGranted] = useState(
    claim?.daysGranted !== null && claim?.daysGranted !== undefined
      ? String(claim.daysGranted)
      : ""
  );
  const [status, setStatus] = useState<EotStatus>(claim?.status ?? "SUBMITTED");
  const [dateSubmitted, setDateSubmitted] = useState(
    toDateInputValue(claim?.dateSubmitted ?? null)
  );
  const [notes, setNotes] = useState(claim?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        reference: reference || null,
        title: title.trim(),
        cause: cause || null,
        description: description || null,
        daysClaimed: Number(daysClaimed),
        daysGranted: daysGranted === "" ? null : Number(daysGranted),
        status,
        dateSubmitted: new Date(dateSubmitted).toISOString(),
        notes: notes || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save EOT claim");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {claim ? "Edit EOT Claim" : "New EOT Claim"}
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
                placeholder="e.g. Delay due to unforeseen rock excavation"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reference
              </label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="EOT-01"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Cause
            </label>
            <input
              list="eot-cause-suggestions"
              value={cause}
              onChange={(e) => setCause(e.target.value)}
              placeholder="e.g. Weather"
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
            <datalist id="eot-cause-suggestions">
              {EOT_CAUSE_SUGGESTIONS.map((c) => (
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
                Days Claimed
              </label>
              <input
                type="number"
                required
                min={0}
                value={daysClaimed}
                onChange={(e) => setDaysClaimed(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Days Granted
              </label>
              <input
                type="number"
                min={0}
                value={daysGranted}
                onChange={(e) => setDaysGranted(e.target.value)}
                placeholder="Once decided"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Date Submitted
              </label>
              <input
                type="date"
                required
                value={dateSubmitted}
                onChange={(e) => setDateSubmitted(e.target.value)}
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
              onChange={(e) => setStatus(e.target.value as EotStatus)}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            >
              {ALL_EOT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {EOT_STATUS_LABELS[s]}
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
