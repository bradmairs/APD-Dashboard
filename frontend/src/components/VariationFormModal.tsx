import { FormEvent, useState } from "react";
import RichTextArea from "./RichTextArea";
import { Variation, VariationInput, VariationStatus } from "../types";
import { ALL_VARIATION_STATUSES, VARIATION_STATUS_LABELS } from "../variationMeta";

interface Props {
  variation: Variation | null;
  onClose: () => void;
  onSave: (data: Partial<VariationInput>) => Promise<void>;
}

function toDateInputValue(value: string | null): string {
  if (!value) return new Date().toISOString().substring(0, 10);
  return value.substring(0, 10);
}

const CATEGORY_SUGGESTIONS = [
  "Latent Conditions",
  "Scope Change",
  "Design Error",
  "Operational Requirement",
  "Client Request",
  "Regulatory Requirement",
];

export default function VariationFormModal({ variation, onClose, onSave }: Props) {
  const [reference, setReference] = useState(variation?.reference ?? "");
  const [title, setTitle] = useState(variation?.title ?? "");
  const [category, setCategory] = useState(variation?.category ?? "");
  const [description, setDescription] = useState(variation?.description ?? "");
  const [costImpact, setCostImpact] = useState(variation?.costImpact ?? "");
  const [timeImpactDays, setTimeImpactDays] = useState(
    variation?.timeImpactDays !== null && variation?.timeImpactDays !== undefined
      ? String(variation.timeImpactDays)
      : ""
  );
  const [status, setStatus] = useState<VariationStatus>(variation?.status ?? "PROPOSED");
  const [dateRaised, setDateRaised] = useState(
    toDateInputValue(variation?.dateRaised ?? null)
  );
  const [notes, setNotes] = useState(variation?.notes ?? "");
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
        category: category || null,
        description: description || null,
        costImpact: String(costImpact),
        timeImpactDays: timeImpactDays === "" ? null : Number(timeImpactDays),
        status,
        dateRaised: new Date(dateRaised).toISOString(),
        notes: notes || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save variation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {variation ? "Edit Variation" : "New Variation"}
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
                placeholder="e.g. Additional dewatering for wet well excavation"
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
                placeholder="VAR-01"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <input
              list="variation-category-suggestions"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Latent Conditions"
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
            <datalist id="variation-category-suggestions">
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
                Cost Impact ($, Excl. GST)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={costImpact}
                onChange={(e) => setCostImpact(e.target.value)}
                placeholder="Negative for a credit"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Time Impact (days)
              </label>
              <input
                type="number"
                value={timeImpactDays}
                onChange={(e) => setTimeImpactDays(e.target.value)}
                placeholder="Optional"
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
              onChange={(e) => setStatus(e.target.value as VariationStatus)}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            >
              {ALL_VARIATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {VARIATION_STATUS_LABELS[s]}
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
              {saving ? "Saving…" : "Save Variation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
