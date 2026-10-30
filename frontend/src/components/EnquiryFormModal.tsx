import { FormEvent, useState } from "react";
import RichTextArea from "./RichTextArea";
import { CommunityEnquiry, CommunityEnquiryInput, EnquiryCategory, EnquiryStatus } from "../types";
import { ALL_ENQUIRY_CATEGORIES, ALL_ENQUIRY_STATUSES, ENQUIRY_CATEGORY_LABELS, ENQUIRY_STATUS_LABELS } from "../enquiryMeta";

interface Props {
  enquiry: CommunityEnquiry | null;
  onClose: () => void;
  onSave: (data: Partial<CommunityEnquiryInput>) => Promise<void>;
}

function toDateInputValue(value: string | null): string {
  return value ? value.substring(0, 10) : "";
}

export default function EnquiryFormModal({ enquiry, onClose, onSave }: Props) {
  const [reference, setReference] = useState(enquiry?.reference ?? "");
  const [category, setCategory] = useState<EnquiryCategory>(enquiry?.category ?? "OTHER");
  const [source, setSource] = useState(enquiry?.source ?? "");
  const [contactName, setContactName] = useState(enquiry?.contactName ?? "");
  const [contactDetails, setContactDetails] = useState(enquiry?.contactDetails ?? "");
  const [description, setDescription] = useState(enquiry?.description ?? "");
  const [dateReceived, setDateReceived] = useState(
    toDateInputValue(enquiry?.dateReceived ?? null) || new Date().toISOString().substring(0, 10)
  );
  const [status, setStatus] = useState<EnquiryStatus>(enquiry?.status ?? "OPEN");
  const [assignedTo, setAssignedTo] = useState(enquiry?.assignedTo ?? "");
  const [resolution, setResolution] = useState(enquiry?.resolution ?? "");
  const [notes, setNotes] = useState(enquiry?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        reference: reference || null,
        category,
        source: source || null,
        contactName: contactName || null,
        contactDetails: contactDetails || null,
        description: description.trim(),
        dateReceived: new Date(dateReceived).toISOString(),
        status,
        assignedTo: assignedTo || null,
        resolution: resolution || null,
        notes: notes || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save enquiry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {enquiry ? "Edit Enquiry" : "New Enquiry"}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EnquiryCategory)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {ALL_ENQUIRY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {ENQUIRY_CATEGORY_LABELS[c]}
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
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Source
              </label>
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Phone, email…"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Date Received
              </label>
              <input
                type="date"
                required
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EnquiryStatus)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {ALL_ENQUIRY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ENQUIRY_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Assigned To
              </label>
              <input
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Optional"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Resolution
            </label>
            <RichTextArea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={2}
              placeholder="Once resolved"
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
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
