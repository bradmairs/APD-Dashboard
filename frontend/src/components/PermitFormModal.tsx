import { FormEvent, useState } from "react";
import RichTextArea from "./RichTextArea";
import { Permit, PermitInput, PermitStatus } from "../types";
import { ALL_PERMIT_STATUSES, PERMIT_STATUS_LABELS } from "../permitMeta";

interface Props {
  permit: Permit | null;
  onClose: () => void;
  onSave: (data: Partial<PermitInput>) => Promise<void>;
}

function toDateInputValue(value: string | null): string {
  return value ? value.substring(0, 10) : "";
}

const CATEGORY_SUGGESTIONS = [
  "Environmental",
  "Planning",
  "Cultural Heritage",
  "Traffic Management",
  "Works Approval",
];

export default function PermitFormModal({ permit, onClose, onSave }: Props) {
  const [title, setTitle] = useState(permit?.title ?? "");
  const [category, setCategory] = useState(permit?.category ?? "");
  const [referenceNumber, setReferenceNumber] = useState(permit?.referenceNumber ?? "");
  const [issuingAuthority, setIssuingAuthority] = useState(permit?.issuingAuthority ?? "");
  const [status, setStatus] = useState<PermitStatus>(permit?.status ?? "PENDING");
  const [dateApplied, setDateApplied] = useState(toDateInputValue(permit?.dateApplied ?? null));
  const [dateApproved, setDateApproved] = useState(
    toDateInputValue(permit?.dateApproved ?? null)
  );
  const [expiryDate, setExpiryDate] = useState(toDateInputValue(permit?.expiryDate ?? null));
  const [notes, setNotes] = useState(permit?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        category: category || null,
        referenceNumber: referenceNumber || null,
        issuingAuthority: issuingAuthority || null,
        status,
        dateApplied: dateApplied ? new Date(dateApplied).toISOString() : null,
        dateApproved: dateApproved ? new Date(dateApproved).toISOString() : null,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
        notes: notes || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save permit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {permit ? "Edit Permit" : "New Permit"}
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
              placeholder="e.g. Cultural Heritage Management Plan"
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <input
                list="permit-category-suggestions"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Environmental"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
              <datalist id="permit-category-suggestions">
                {CATEGORY_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reference Number
              </label>
              <input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Issuing Authority
            </label>
            <input
              value={issuingAuthority}
              onChange={(e) => setIssuingAuthority(e.target.value)}
              placeholder="e.g. Local Council, EPA"
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Date Applied
              </label>
              <input
                type="date"
                value={dateApplied}
                onChange={(e) => setDateApplied(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Date Approved
              </label>
              <input
                type="date"
                value={dateApproved}
                onChange={(e) => setDateApproved(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
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
              onChange={(e) => setStatus(e.target.value as PermitStatus)}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            >
              {ALL_PERMIT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PERMIT_STATUS_LABELS[s]}
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
