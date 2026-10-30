import { FormEvent, useState } from "react";
import RichTextArea from "./RichTextArea";
import {
  Risk,
  RiskConsequence,
  RiskInput,
  RiskLikelihood,
  RiskStatus,
  RiskType,
} from "../types";
import {
  ALL_CONSEQUENCES,
  ALL_LIKELIHOODS,
  CONSEQUENCE_LABELS,
  LIKELIHOOD_LABELS,
} from "../riskScoring";
import { ALL_RISK_STATUSES, ALL_RISK_TYPES, RISK_STATUS_LABELS, RISK_TYPE_LABELS } from "../riskMeta";

interface Props {
  risk: Risk | null;
  onClose: () => void;
  onSave: (data: Partial<RiskInput>) => Promise<void>;
}

const CATEGORY_SUGGESTIONS = [
  "Design",
  "Construction",
  "Commercial",
  "Environmental",
  "Stakeholder",
  "Regulatory",
  "Safety",
];

function toDateInputValue(value: string | null): string {
  return value ? value.substring(0, 10) : "";
}

export default function RiskFormModal({ risk, onClose, onSave }: Props) {
  const [type, setType] = useState<RiskType>(risk?.type ?? "RISK");
  const [title, setTitle] = useState(risk?.title ?? "");
  const [category, setCategory] = useState(risk?.category ?? "");
  const [description, setDescription] = useState(risk?.description ?? "");
  const [inherentLikelihood, setInherentLikelihood] = useState<RiskLikelihood>(
    risk?.inherentLikelihood ?? "POSSIBLE"
  );
  const [inherentConsequence, setInherentConsequence] = useState<RiskConsequence>(
    risk?.inherentConsequence ?? "MODERATE"
  );
  const [residualLikelihood, setResidualLikelihood] = useState<RiskLikelihood | "">(
    risk?.residualLikelihood ?? ""
  );
  const [residualConsequence, setResidualConsequence] = useState<RiskConsequence | "">(
    risk?.residualConsequence ?? ""
  );
  const [mitigation, setMitigation] = useState(risk?.mitigation ?? "");
  const [ownerName, setOwnerName] = useState(risk?.ownerName ?? "");
  const [dueDate, setDueDate] = useState(toDateInputValue(risk?.dueDate ?? null));
  const [status, setStatus] = useState<RiskStatus>(risk?.status ?? "OPEN");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        type,
        title: title.trim(),
        category: category || null,
        description: description || null,
        inherentLikelihood,
        inherentConsequence,
        residualLikelihood: residualLikelihood || null,
        residualConsequence: residualConsequence || null,
        mitigation: mitigation || null,
        ownerName: ownerName || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        status,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save risk");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {risk ? "Edit Risk / Opportunity" : "New Risk / Opportunity"}
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
                placeholder="e.g. Delay to long-lead valve procurement"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as RiskType)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {ALL_RISK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {RISK_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <input
              list="risk-category-suggestions"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Construction"
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
            <datalist id="risk-category-suggestions">
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

          <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Inherent Rating (before mitigation)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Likelihood
                </label>
                <select
                  value={inherentLikelihood}
                  onChange={(e) => setInherentLikelihood(e.target.value as RiskLikelihood)}
                  className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
                >
                  {ALL_LIKELIHOODS.map((l) => (
                    <option key={l} value={l}>
                      {LIKELIHOOD_LABELS[l]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Consequence
                </label>
                <select
                  value={inherentConsequence}
                  onChange={(e) => setInherentConsequence(e.target.value as RiskConsequence)}
                  className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
                >
                  {ALL_CONSEQUENCES.map((c) => (
                    <option key={c} value={c}>
                      {CONSEQUENCE_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Residual Rating (after mitigation, optional)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Likelihood
                </label>
                <select
                  value={residualLikelihood}
                  onChange={(e) => setResidualLikelihood(e.target.value as RiskLikelihood | "")}
                  className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
                >
                  <option value="">Not assessed</option>
                  {ALL_LIKELIHOODS.map((l) => (
                    <option key={l} value={l}>
                      {LIKELIHOOD_LABELS[l]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Consequence
                </label>
                <select
                  value={residualConsequence}
                  onChange={(e) => setResidualConsequence(e.target.value as RiskConsequence | "")}
                  className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
                >
                  <option value="">Not assessed</option>
                  {ALL_CONSEQUENCES.map((c) => (
                    <option key={c} value={c}>
                      {CONSEQUENCE_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Mitigation / Response
            </label>
            <RichTextArea
              value={mitigation}
              onChange={(e) => setMitigation(e.target.value)}
              rows={2}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Owner
              </label>
              <input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
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
                onChange={(e) => setStatus(e.target.value as RiskStatus)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {ALL_RISK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {RISK_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
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
