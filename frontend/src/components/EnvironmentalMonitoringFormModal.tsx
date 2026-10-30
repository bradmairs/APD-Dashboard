import { FormEvent, useState } from "react";
import RichTextArea from "./RichTextArea";
import {
  EnvironmentalMonitoringRecord,
  EnvironmentalMonitoringRecordInput,
  LimitType,
} from "../types";
import { LIMIT_TYPE_LABELS, PARAMETER_SUGGESTIONS } from "../environmentalMeta";

interface Props {
  record: EnvironmentalMonitoringRecord | null;
  onClose: () => void;
  onSave: (data: Partial<EnvironmentalMonitoringRecordInput>) => Promise<void>;
}

const LIMIT_TYPES: LimitType[] = ["MAX", "MIN"];

function toDateInputValue(value: string | null): string {
  if (!value) return new Date().toISOString().substring(0, 10);
  return value.substring(0, 10);
}

export default function EnvironmentalMonitoringFormModal({ record, onClose, onSave }: Props) {
  const [parameter, setParameter] = useState(record?.parameter ?? "");
  const [location, setLocation] = useState(record?.location ?? "");
  const [monitoringDate, setMonitoringDate] = useState(
    toDateInputValue(record?.monitoringDate ?? null)
  );
  const [readingValue, setReadingValue] = useState(
    record?.readingValue !== undefined ? String(record.readingValue) : ""
  );
  const [unit, setUnit] = useState(record?.unit ?? "");
  const [limitValue, setLimitValue] = useState(
    record?.limitValue !== null && record?.limitValue !== undefined
      ? String(record.limitValue)
      : ""
  );
  const [limitType, setLimitType] = useState<LimitType>(record?.limitType ?? "MAX");
  const [correctiveAction, setCorrectiveAction] = useState(record?.correctiveAction ?? "");
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        parameter: parameter.trim(),
        location: location || null,
        monitoringDate: new Date(monitoringDate).toISOString(),
        readingValue: Number(readingValue),
        unit: unit.trim(),
        limitValue: limitValue === "" ? null : Number(limitValue),
        limitType,
        correctiveAction: correctiveAction || null,
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
            {record ? "Edit Monitoring Reading" : "New Monitoring Reading"}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Parameter
              </label>
              <input
                list="environmental-parameter-suggestions"
                required
                value={parameter}
                onChange={(e) => setParameter(e.target.value)}
                placeholder="e.g. Noise"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
              <datalist id="environmental-parameter-suggestions">
                {PARAMETER_SUGGESTIONS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Monitoring Date
              </label>
              <input
                type="date"
                required
                value={monitoringDate}
                onChange={(e) => setMonitoringDate(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reading
              </label>
              <input
                type="number"
                step="any"
                required
                value={readingValue}
                onChange={(e) => setReadingValue(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Unit
              </label>
              <input
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. dB, NTU, mm/s"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Limit Value
              </label>
              <input
                type="number"
                step="any"
                value={limitValue}
                onChange={(e) => setLimitValue(e.target.value)}
                placeholder="Optional"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Limit Type
              </label>
              <select
                value={limitType}
                onChange={(e) => setLimitType(e.target.value as LimitType)}
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {LIMIT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {LIMIT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
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
