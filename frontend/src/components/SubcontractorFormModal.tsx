import { FormEvent, useState } from "react";
import RichTextArea from "./RichTextArea";
import { Subcontractor, SubcontractorInput, SubcontractorStatus } from "../types";
import {
  ALL_SUBCONTRACTOR_STATUSES,
  SUBCONTRACTOR_STATUS_LABELS,
  TRADE_SUGGESTIONS,
} from "../subcontractorMeta";

interface Props {
  subcontractor: Subcontractor | null;
  onClose: () => void;
  onSave: (data: Partial<SubcontractorInput>) => Promise<void>;
}

function toDateInputValue(value: string | null): string {
  return value ? value.substring(0, 10) : "";
}

export default function SubcontractorFormModal({ subcontractor, onClose, onSave }: Props) {
  const [companyName, setCompanyName] = useState(subcontractor?.companyName ?? "");
  const [trade, setTrade] = useState(subcontractor?.trade ?? "");
  const [contactName, setContactName] = useState(subcontractor?.contactName ?? "");
  const [contactDetails, setContactDetails] = useState(subcontractor?.contactDetails ?? "");
  const [contractValue, setContractValue] = useState(subcontractor?.contractValue ?? "");
  const [startDate, setStartDate] = useState(toDateInputValue(subcontractor?.startDate ?? null));
  const [endDate, setEndDate] = useState(toDateInputValue(subcontractor?.endDate ?? null));
  const [status, setStatus] = useState<SubcontractorStatus>(subcontractor?.status ?? "ENGAGED");
  const [insuranceExpiry, setInsuranceExpiry] = useState(
    toDateInputValue(subcontractor?.insuranceExpiry ?? null)
  );
  const [notes, setNotes] = useState(subcontractor?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        companyName: companyName.trim(),
        trade: trade || null,
        contactName: contactName || null,
        contactDetails: contactDetails || null,
        contractValue: contractValue || null,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        status,
        insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry).toISOString() : null,
        notes: notes || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save subcontractor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {subcontractor ? "Edit Subcontractor" : "New Subcontractor"}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Company Name
              </label>
              <input
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Example Civil Pty Ltd"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Trade
              </label>
              <input
                list="subcontractor-trade-suggestions"
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                placeholder="e.g. Electrical"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
              <datalist id="subcontractor-trade-suggestions">
                {TRADE_SUGGESTIONS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Contact Name
              </label>
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Optional"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Contact Details
              </label>
              <input
                value={contactDetails}
                onChange={(e) => setContactDetails(e.target.value)}
                placeholder="Phone or email"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Contract Value ($, Excl. GST)
              </label>
              <input
                type="number"
                step="0.01"
                value={contractValue}
                onChange={(e) => setContractValue(e.target.value)}
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
                onChange={(e) => setStatus(e.target.value as SubcontractorStatus)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {ALL_SUBCONTRACTOR_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {SUBCONTRACTOR_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Insurance Expiry
              </label>
              <input
                type="date"
                value={insuranceExpiry}
                onChange={(e) => setInsuranceExpiry(e.target.value)}
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
