import { FormEvent, useState } from "react";
import { CashFlowEntry, CashFlowEntryInput, CashFlowType } from "../types";
import { formatCurrency } from "../format";

interface Props {
  entry: CashFlowEntry | null;
  // Every entry on the project, so converting forecast <-> actual can warn
  // when the target type already exists for that month.
  entries: CashFlowEntry[];
  // Opens an existing entry already switched to this type (the "Mark as actual"
  // shortcut).
  initialType?: CashFlowType;
  onClose: () => void;
  onSave: (data: Partial<CashFlowEntryInput>) => Promise<void>;
}

function toMonthInputValue(value: string | null): string {
  if (!value) return "";
  return value.substring(0, 7);
}

export default function CashFlowEntryFormModal({
  entry,
  entries,
  initialType,
  onClose,
  onSave,
}: Props) {
  const [month, setMonth] = useState(toMonthInputValue(entry?.month ?? null));
  const [type, setType] = useState<CashFlowType>(
    initialType ?? entry?.type ?? "ACTUAL"
  );
  const [amount, setAmount] = useState(entry?.amount ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const replaced =
    entry && type !== entry.type
      ? entries.find(
          (other) =>
            other.id !== entry.id &&
            other.type === type &&
            other.month.substring(0, 7) === entry.month.substring(0, 7)
        )
      : undefined;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({ month, type, amount: String(amount) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {entry ? "Edit Cash Flow Entry" : "New Cash Flow Entry"}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Month
            </label>
            <input
              type="month"
              required
              disabled={!!entry}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CashFlowType)}
              className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm "
            >
              <option value="ACTUAL">Actual</option>
              <option value="FORECAST">Forecast</option>
            </select>
            {entry && type !== entry.type && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {replaced
                  ? `This month already has a ${type.toLowerCase()} entry (${formatCurrency(
                      replaced.amount
                    )}) — saving replaces it with this amount.`
                  : `Changes this ${entry.type.toLowerCase()} entry to ${type.toLowerCase()}.`}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Amount ($)
            </label>
            <input
              type="number"
              required
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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
              {saving ? "Saving…" : "Save Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
