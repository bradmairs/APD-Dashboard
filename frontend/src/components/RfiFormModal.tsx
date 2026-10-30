import { FormEvent, useState } from "react";
import RichTextArea from "./RichTextArea";
import { Rfi, RfiInput, RfiStatus } from "../types";
import { ALL_RFI_STATUSES, RFI_STATUS_LABELS } from "../rfiMeta";

interface Props {
  rfi: Rfi | null;
  onClose: () => void;
  onSave: (data: Partial<RfiInput>) => Promise<void>;
}

function toDateInputValue(value: string | null): string {
  return value ? value.substring(0, 10) : "";
}

export default function RfiFormModal({ rfi, onClose, onSave }: Props) {
  const [rfiNumber, setRfiNumber] = useState(rfi?.rfiNumber ?? "");
  const [subject, setSubject] = useState(rfi?.subject ?? "");
  const [question, setQuestion] = useState(rfi?.question ?? "");
  const [response, setResponse] = useState(rfi?.response ?? "");
  const [raisedTo, setRaisedTo] = useState(rfi?.raisedTo ?? "");
  const [status, setStatus] = useState<RfiStatus>(rfi?.status ?? "OPEN");
  const [dateRaised, setDateRaised] = useState(
    toDateInputValue(rfi?.dateRaised ?? null) || new Date().toISOString().substring(0, 10)
  );
  const [dateRequired, setDateRequired] = useState(
    toDateInputValue(rfi?.dateRequired ?? null)
  );
  const [notes, setNotes] = useState(rfi?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        rfiNumber: rfiNumber.trim(),
        subject: subject.trim(),
        question: question.trim(),
        response: response || null,
        raisedTo: raisedTo || null,
        status,
        dateRaised: new Date(dateRaised).toISOString(),
        dateRequired: dateRequired ? new Date(dateRequired).toISOString() : null,
        notes: notes || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save RFI");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {rfi ? "Edit RFI" : "New RFI"}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                RFI Number
              </label>
              <input
                required
                value={rfiNumber}
                onChange={(e) => setRfiNumber(e.target.value)}
                placeholder="e.g. RFI-014"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2 min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Subject
              </label>
              <input
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Valve chamber invert levels"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Question
            </label>
            <RichTextArea
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Response
            </label>
            <RichTextArea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={3}
              placeholder="Once answered"
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Raised To
              </label>
              <input
                value={raisedTo}
                onChange={(e) => setRaisedTo(e.target.value)}
                placeholder="Designer, consultant, or client"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RfiStatus)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {ALL_RFI_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {RFI_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Response Required By
              </label>
              <input
                type="date"
                value={dateRequired}
                onChange={(e) => setDateRequired(e.target.value)}
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
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
