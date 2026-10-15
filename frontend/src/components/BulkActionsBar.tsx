import { useState } from "react";
import { useConfirm } from "../confirm/ConfirmContext";

interface Props<S extends string> {
  count: number;
  entityLabel: string; // e.g. "risk" — used in "Delete 3 risks?"
  statusOptions?: { value: S; label: string }[]; // omit to hide the status control
  onApplyStatus?: (status: S) => Promise<void>;
  onDelete: () => Promise<void>;
  onClear: () => void;
}

// A toolbar shown above a register's list once one or more rows are
// checkbox-selected — "Set status to X" (applied to every selected row) and
// "Delete" (with a confirm, since there's no undo). Both actions call the
// panel's existing onUpdate/onDelete per row in a loop rather than a bulk
// backend endpoint — these panels' lists are already small enough (tens,
// not thousands, of rows) that this is simpler than adding bulk PUT/DELETE
// routes for every register.
export default function BulkActionsBar<S extends string>({
  count,
  entityLabel,
  statusOptions,
  onApplyStatus,
  onDelete,
  onClear,
}: Props<S>) {
  const [pendingStatus, setPendingStatus] = useState<S | "">("");
  const [busy, setBusy] = useState(false);

  async function handleApplyStatus() {
    if (!pendingStatus || !onApplyStatus) return;
    setBusy(true);
    try {
      await onApplyStatus(pendingStatus);
      setPendingStatus("");
    } finally {
      setBusy(false);
    }
  }

  const confirm = useConfirm();

  async function handleDelete() {
    if (!await confirm(`Delete ${count} ${entityLabel}${count === 1 ? "" : "s"}? This cannot be undone.`)) {
      return;
    }
    setBusy(true);
    try {
      await onDelete();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded px-3 py-2 mb-3 text-sm">
      <span className="text-blue-800 dark:text-blue-300 font-medium">
        {count} selected
      </span>
      {statusOptions && onApplyStatus && (
        <>
          <select
            value={pendingStatus}
            onChange={(e) => setPendingStatus(e.target.value as S)}
            className="text-xs rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-2 py-1"
          >
            <option value="">Set status to…</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleApplyStatus}
            disabled={!pendingStatus || busy}
            className="px-2.5 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Apply
          </button>
        </>
      )}
      <button
        onClick={handleDelete}
        disabled={busy}
        className="px-2.5 py-1 text-xs rounded border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
      >
        Delete
      </button>
      <button
        onClick={onClear}
        className="ml-auto text-xs text-slate-500 dark:text-slate-400 hover:underline"
      >
        Clear selection
      </button>
    </div>
  );
}
