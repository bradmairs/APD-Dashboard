import { useState } from "react";
import { ActionCandidate, ActionImportPreview } from "../types";
import { formatDate } from "../format";
import { useAuth } from "../auth/AuthContext";

interface Props {
  preview: ActionImportPreview;
  onConfirm: (actions: ActionCandidate[]) => Promise<void>;
  onClose: () => void;
}

const STATE_NOTES: Record<ActionCandidate["state"], string | null> = {
  new: null,
  duplicate: "Already on the project",
  closed: "Marked closed in the minutes",
};

// Shown after Word minutes are attached to a meeting: a summary of the
// project manager's actions found in the document's action table, each with
// a tick box, so they're confirmed before anything is added. New actions
// start ticked; ones already on the project can't be added again; ones the
// minutes mark closed start unticked.
export default function ActionImportReviewModal({ preview, onConfirm, onClose }: Props) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(preview.candidates.flatMap((c, i) => (c.state === "new" ? [i] : [])))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectable = preview.candidates.flatMap((c, i) => (c.state === "duplicate" ? [] : [i]));
  const allTicked = selectable.length > 0 && selectable.every((i) => selected.has(i));
  const isManager = !!user && user.name === preview.manager;

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      await onConfirm(preview.candidates.filter((_, i) => selected.has(i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add the actions");
      setSaving(false);
    }
  }

  const counts = {
    new: preview.candidates.filter((c) => c.state === "new").length,
    duplicate: preview.candidates.filter((c) => c.state === "duplicate").length,
    closed: preview.candidates.filter((c) => c.state === "closed").length,
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 pb-3 space-y-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Confirm actions from the minutes
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">{preview.fileName}</span> has {preview.found} action
            {preview.found === 1 ? "" : "s"} in its action table.{" "}
            <span className="font-medium">
              {preview.candidates.length} {preview.candidates.length === 1 ? "is" : "are"} assigned
              to {preview.manager}
            </span>
            {preview.skippedOthers > 0 &&
              ` and ${preview.skippedOthers} to others (not shown, won't be added)`}
            .
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tick the actions to add to Actions &amp; Decisions — they'll be owned by{" "}
            {preview.manager} and linked to this meeting.
            {counts.duplicate > 0 && ` ${counts.duplicate} already on the project.`}
            {counts.closed > 0 && ` ${counts.closed} marked closed in the minutes.`}
          </p>
          {!isManager && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              These are {preview.manager}'s actions — check with them if you're not sure which to add.
            </p>
          )}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 overflow-y-auto">
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 py-2 border-b border-slate-100 dark:border-slate-700">
            <input
              type="checkbox"
              checked={allTicked}
              disabled={selectable.length === 0}
              onChange={() =>
                setSelected(allTicked ? new Set() : new Set(selectable))
              }
              className="h-4 w-4"
            />
            Tick all
          </label>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {preview.candidates.map((c, i) => {
              const disabled = c.state === "duplicate";
              const shared = c.ownerInMinutes && c.ownerInMinutes !== preview.manager;
              return (
                <li key={i}>
                  <label
                    className={`flex items-start gap-3 py-2.5 text-sm ${
                      disabled ? "opacity-60" : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      disabled={disabled}
                      onChange={() => toggle(i)}
                      className="h-4 w-4 mt-0.5 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="text-slate-900 dark:text-slate-100">{c.action}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {c.dueDate
                          ? `Due ${formatDate(c.dueDate)}`
                          : c.dueText
                            ? `Due: ${c.dueText}`
                            : "No due date"}
                        {shared && ` · Owner in minutes: ${c.ownerInMinutes}`}
                        {STATE_NOTES[c.state] && ` · ${STATE_NOTES[c.state]}`}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="p-6 pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Don't add any
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={saving || selected.size === 0}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving
              ? "Adding…"
              : `Add ${selected.size} action${selected.size === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
