import { FormEvent, useState } from "react";
import RichTextArea from "./RichTextArea";
import { TenderMethod, TenderPackage, TenderPackageInput, TenderStatus } from "../types";
import {
  ALL_TENDER_METHODS,
  ALL_TENDER_STATUSES,
  TENDER_METHOD_LABELS,
  TENDER_STATUS_LABELS,
} from "../tenderMeta";

interface Props {
  tenderPackage: TenderPackage | null;
  onClose: () => void;
  onSave: (data: Partial<TenderPackageInput>) => Promise<void>;
}

function toDateInputValue(value: string | null): string {
  return value ? value.substring(0, 10) : "";
}

export default function TenderPackageFormModal({ tenderPackage, onClose, onSave }: Props) {
  const [packageNumber, setPackageNumber] = useState(tenderPackage?.packageNumber ?? "");
  const [title, setTitle] = useState(tenderPackage?.title ?? "");
  const [description, setDescription] = useState(tenderPackage?.description ?? "");
  const [method, setMethod] = useState<TenderMethod>(tenderPackage?.method ?? "OPEN");
  const [status, setStatus] = useState<TenderStatus>(tenderPackage?.status ?? "PLANNED");
  const [dateIssued, setDateIssued] = useState(
    toDateInputValue(tenderPackage?.dateIssued ?? null)
  );
  const [closingDate, setClosingDate] = useState(
    toDateInputValue(tenderPackage?.closingDate ?? null)
  );
  const [submissionsReceived, setSubmissionsReceived] = useState(
    tenderPackage?.submissionsReceived !== null && tenderPackage?.submissionsReceived !== undefined
      ? String(tenderPackage.submissionsReceived)
      : ""
  );
  const [estimatedValue, setEstimatedValue] = useState(
    tenderPackage?.estimatedValue !== null && tenderPackage?.estimatedValue !== undefined
      ? String(tenderPackage.estimatedValue)
      : ""
  );
  const [awardedTo, setAwardedTo] = useState(tenderPackage?.awardedTo ?? "");
  const [awardedValue, setAwardedValue] = useState(
    tenderPackage?.awardedValue !== null && tenderPackage?.awardedValue !== undefined
      ? String(tenderPackage.awardedValue)
      : ""
  );
  const [notes, setNotes] = useState(tenderPackage?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        packageNumber: packageNumber || null,
        title: title.trim(),
        description: description || null,
        method,
        status,
        dateIssued: dateIssued ? new Date(dateIssued).toISOString() : null,
        closingDate: closingDate ? new Date(closingDate).toISOString() : null,
        submissionsReceived: submissionsReceived === "" ? null : Number(submissionsReceived),
        estimatedValue: estimatedValue === "" ? null : Number(estimatedValue),
        awardedTo: awardedTo || null,
        awardedValue: awardedValue === "" ? null : Number(awardedValue),
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
            {tenderPackage ? "Edit Tender Package" : "New Tender Package"}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0 sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Title
              </label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Design Consultancy Services"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Package Number
              </label>
              <input
                value={packageNumber}
                onChange={(e) => setPackageNumber(e.target.value)}
                placeholder="Optional"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as TenderMethod)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {ALL_TENDER_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {TENDER_METHOD_LABELS[m]}
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
              rows={2}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Date Issued
              </label>
              <input
                type="date"
                value={dateIssued}
                onChange={(e) => setDateIssued(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Closing Date
              </label>
              <input
                type="date"
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Submissions
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={submissionsReceived}
                onChange={(e) => setSubmissionsReceived(e.target.value)}
                placeholder="Optional"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Estimated Value ($, Excl. GST)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                placeholder="Optional"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TenderStatus)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {ALL_TENDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TENDER_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {status === "AWARDED" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Awarded To
                </label>
                <input
                  value={awardedTo}
                  onChange={(e) => setAwardedTo(e.target.value)}
                  placeholder="Winning bidder"
                  className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Awarded Value ($, Excl. GST)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={awardedValue}
                  onChange={(e) => setAwardedValue(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

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
