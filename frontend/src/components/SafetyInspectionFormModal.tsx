import { FormEvent, useState } from "react";
import RichTextArea from "./RichTextArea";
import { SafetyInspection, SafetyInspectionInput, SafetyInspectionStatus } from "../types";
import {
  ALL_SAFETY_INSPECTION_STATUSES,
  INSPECTION_TYPE_SUGGESTIONS,
  SAFETY_INSPECTION_STATUS_LABELS,
} from "../safetyInspectionMeta";

interface Props {
  inspection: SafetyInspection | null;
  onClose: () => void;
  onSave: (data: Partial<SafetyInspectionInput>) => Promise<void>;
}

function toDateInputValue(value: string | null): string {
  if (!value) return new Date().toISOString().substring(0, 10);
  return value.substring(0, 10);
}

export default function SafetyInspectionFormModal({ inspection, onClose, onSave }: Props) {
  const [inspectionDate, setInspectionDate] = useState(
    toDateInputValue(inspection?.inspectionDate ?? null)
  );
  const [inspectionType, setInspectionType] = useState(inspection?.inspectionType ?? "");
  const [location, setLocation] = useState(inspection?.location ?? "");
  const [conductedBy, setConductedBy] = useState(inspection?.conductedBy ?? "");
  const [score, setScore] = useState(
    inspection?.score !== null && inspection?.score !== undefined
      ? String(inspection.score)
      : ""
  );
  const [findings, setFindings] = useState(inspection?.findings ?? "");
  const [correctiveAction, setCorrectiveAction] = useState(inspection?.correctiveAction ?? "");
  const [status, setStatus] = useState<SafetyInspectionStatus>(inspection?.status ?? "OPEN");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        inspectionDate: new Date(inspectionDate).toISOString(),
        inspectionType: inspectionType.trim(),
        location: location || null,
        conductedBy: conductedBy.trim(),
        score: score === "" ? null : Number(score),
        findings: findings || null,
        correctiveAction: correctiveAction || null,
        status,
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
            {inspection ? "Edit Safety Inspection" : "New Safety Inspection"}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Inspection Type
              </label>
              <input
                list="safety-inspection-type-suggestions"
                required
                value={inspectionType}
                onChange={(e) => setInspectionType(e.target.value)}
                placeholder="e.g. Safety Walk"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
              <datalist id="safety-inspection-type-suggestions">
                {INSPECTION_TYPE_SUGGESTIONS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Inspection Date
              </label>
              <input
                type="date"
                required
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Conducted By
              </label>
              <input
                required
                value={conductedBy}
                onChange={(e) => setConductedBy(e.target.value)}
                placeholder="e.g. External WHS Auditor"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Location
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Optional"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Score (0-100)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={score}
                onChange={(e) => setScore(e.target.value)}
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
                onChange={(e) => setStatus(e.target.value as SafetyInspectionStatus)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {ALL_SAFETY_INSPECTION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {SAFETY_INSPECTION_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Findings
            </label>
            <RichTextArea
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              rows={3}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Corrective Action
            </label>
            <RichTextArea
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
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
