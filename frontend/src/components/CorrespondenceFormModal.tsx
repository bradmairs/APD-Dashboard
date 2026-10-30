import { FormEvent, useState } from "react";
import RichTextArea from "./RichTextArea";
import { Correspondence, CorrespondenceDirection, CorrespondenceInput, CorrespondenceStatus } from "../types";
import {
  ALL_CORRESPONDENCE_DIRECTIONS,
  ALL_CORRESPONDENCE_STATUSES,
  CORRESPONDENCE_DIRECTION_LABELS,
  CORRESPONDENCE_STATUS_LABELS,
} from "../correspondenceMeta";

interface Props {
  item: Correspondence | null;
  onClose: () => void;
  onSave: (data: Partial<CorrespondenceInput>) => Promise<void>;
}

function toDateInputValue(value: string | null): string {
  return value ? value.substring(0, 10) : "";
}

export default function CorrespondenceFormModal({ item, onClose, onSave }: Props) {
  const [reference, setReference] = useState(item?.reference ?? "");
  const [direction, setDirection] = useState<CorrespondenceDirection>(
    item?.direction ?? "OUTGOING"
  );
  const [correspondent, setCorrespondent] = useState(item?.correspondent ?? "");
  const [subject, setSubject] = useState(item?.subject ?? "");
  const [summary, setSummary] = useState(item?.summary ?? "");
  const [dateSent, setDateSent] = useState(
    toDateInputValue(item?.dateSent ?? null) || new Date().toISOString().substring(0, 10)
  );
  const [responseDueDate, setResponseDueDate] = useState(
    toDateInputValue(item?.responseDueDate ?? null)
  );
  const [status, setStatus] = useState<CorrespondenceStatus>(item?.status ?? "OPEN");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        reference: reference || null,
        direction,
        correspondent: correspondent.trim(),
        subject: subject.trim(),
        summary: summary || null,
        dateSent: new Date(dateSent).toISOString(),
        responseDueDate: responseDueDate ? new Date(responseDueDate).toISOString() : null,
        status,
        notes: notes || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save correspondence");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {item ? "Edit Correspondence" : "New Correspondence"}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reference
              </label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Optional"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Direction
              </label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as CorrespondenceDirection)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {ALL_CORRESPONDENCE_DIRECTIONS.map((d) => (
                  <option key={d} value={d}>
                    {CORRESPONDENCE_DIRECTION_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Correspondent
              </label>
              <input
                required
                value={correspondent}
                onChange={(e) => setCorrespondent(e.target.value)}
                placeholder="Consultant or contractor"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Subject
            </label>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Notice of Delay - Wet Well Excavation"
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Summary
            </label>
            <RichTextArea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Date Sent
              </label>
              <input
                type="date"
                required
                value={dateSent}
                onChange={(e) => setDateSent(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Response Due
              </label>
              <input
                type="date"
                value={responseDueDate}
                onChange={(e) => setResponseDueDate(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CorrespondenceStatus)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {ALL_CORRESPONDENCE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {CORRESPONDENCE_STATUS_LABELS[s]}
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
