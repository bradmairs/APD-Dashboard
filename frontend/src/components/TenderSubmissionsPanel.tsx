import { FormEvent, useState } from "react";
import FormattedText from "./FormattedText";
import RichTextArea from "./RichTextArea";
import { TenderPackage, TenderSubmission, TenderSubmissionInput } from "../types";
import { formatCurrency, formatDate } from "../format";
import { TENDER_STATUS_COLORS, TENDER_STATUS_LABELS } from "../tenderMeta";
import { useConfirm } from "../confirm/ConfirmContext";

const INPUT_CLASS =
  "w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm";
const LABEL_CLASS = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

interface Props {
  tenderPackages: TenderPackage[];
  submissions: TenderSubmission[];
  onCreate: (tenderPackage: TenderPackage, data: Partial<TenderSubmissionInput>) => Promise<void>;
  onUpdate: (submission: TenderSubmission, data: Partial<TenderSubmissionInput>) => Promise<void>;
  onDelete: (submission: TenderSubmission) => Promise<void>;
}

// Tender submissions received for each tender package and how they were
// assessed — price, conformance, evaluation score and rank, and the
// recommended tenderer — laid out as one comparison table per package.
export default function TenderSubmissionsPanel({
  tenderPackages,
  submissions,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const confirm = useConfirm();
  const [editing, setEditing] = useState<
    { pkg: TenderPackage; submission: TenderSubmission | null } | null
  >(null);

  const byPackage = new Map<string, TenderSubmission[]>();
  for (const s of submissions) {
    byPackage.set(s.tenderPackageId, [...(byPackage.get(s.tenderPackageId) ?? []), s]);
  }
  // Packages that have submissions, or are at the stage of receiving them.
  const packages = tenderPackages.filter(
    (p) => byPackage.has(p.id) || p.status === "ISSUED" || p.status === "EVALUATION"
  );

  async function handleDelete(submission: TenderSubmission) {
    if (!(await confirm(`Delete the submission from ${submission.tendererName}?`))) return;
    await onDelete(submission);
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Tender Submissions &amp; Assessment
        </h2>
        {tenderPackages.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              const pkg = tenderPackages.find((p) => p.id === e.target.value);
              if (pkg) setEditing({ pkg, submission: null });
            }}
            aria-label="Add a submission to a tender package"
            className="rounded bg-blue-600 text-white text-sm px-3 py-1.5 hover:bg-blue-700"
          >
            <option value="">+ Add Submission…</option>
            {tenderPackages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.packageNumber ? `${p.packageNumber} · ` : ""}
                {p.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {tenderPackages.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Add a tender package above first, then record the submissions it receives here.
        </p>
      ) : packages.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No submissions recorded yet. Packages show here once they're issued or have submissions.
        </p>
      ) : (
        <div className="space-y-5">
          {packages.map((pkg) => {
            const rows = byPackage.get(pkg.id) ?? [];
            return (
              <div key={pkg.id}>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {pkg.packageNumber ? `${pkg.packageNumber} · ` : ""}
                    {pkg.title}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${TENDER_STATUS_COLORS[pkg.status]}`}
                  >
                    {TENDER_STATUS_LABELS[pkg.status]}
                  </span>
                  {pkg.estimatedValue && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Estimate {formatCurrency(pkg.estimatedValue)}
                    </span>
                  )}
                  <button
                    onClick={() => setEditing({ pkg, submission: null })}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-auto"
                  >
                    + Add submission
                  </button>
                </div>
                {rows.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    No submissions recorded for this package.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                          <th className="py-1.5 pr-3 font-medium">Rank</th>
                          <th className="py-1.5 pr-3 font-medium">Tenderer</th>
                          <th className="py-1.5 pr-3 font-medium">Received</th>
                          <th className="py-1.5 pr-3 font-medium text-right">Price</th>
                          <th className="py-1.5 pr-3 font-medium">Conforming</th>
                          <th className="py-1.5 pr-3 font-medium text-right">Score</th>
                          <th className="py-1.5 font-medium" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {rows.map((s) => (
                          <tr key={s.id} className="align-top">
                            <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">
                              {s.rank ?? "—"}
                            </td>
                            <td className="py-2 pr-3">
                              <span className="text-slate-900 dark:text-slate-100">
                                {s.tendererName}
                              </span>
                              {s.recommended && (
                                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                                  Recommended
                                </span>
                              )}
                              {s.notes && (
                                <FormattedText className="text-xs text-slate-500 dark:text-slate-400 mt-0.5" text={s.notes} />
                              )}
                            </td>
                            <td className="py-2 pr-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {s.dateReceived ? formatDate(s.dateReceived) : "—"}
                            </td>
                            <td className="py-2 pr-3 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {s.tenderPrice ? formatCurrency(s.tenderPrice) : "—"}
                            </td>
                            <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">
                              {s.conforming === null ? "—" : s.conforming ? "Yes" : "No"}
                            </td>
                            <td className="py-2 pr-3 text-right text-slate-700 dark:text-slate-300">
                              {s.score !== null ? Number(s.score) : "—"}
                            </td>
                            <td className="py-2 text-right whitespace-nowrap">
                              <button
                                onClick={() => setEditing({ pkg, submission: s })}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline mr-3"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(s)}
                                className="text-xs text-red-600 dark:text-red-400 hover:underline"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <SubmissionFormModal
          pkg={editing.pkg}
          submission={editing.submission}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            if (editing.submission) await onUpdate(editing.submission, data);
            else await onCreate(editing.pkg, data);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function SubmissionFormModal({
  pkg,
  submission,
  onClose,
  onSave,
}: {
  pkg: TenderPackage;
  submission: TenderSubmission | null;
  onClose: () => void;
  onSave: (data: Partial<TenderSubmissionInput>) => Promise<void>;
}) {
  const [tendererName, setTendererName] = useState(submission?.tendererName ?? "");
  const [dateReceived, setDateReceived] = useState(submission?.dateReceived?.substring(0, 10) ?? "");
  const [tenderPrice, setTenderPrice] = useState(submission?.tenderPrice ?? "");
  const [conforming, setConforming] = useState(
    submission?.conforming === null || submission?.conforming === undefined
      ? ""
      : submission.conforming
        ? "yes"
        : "no"
  );
  const [score, setScore] = useState(submission?.score ?? "");
  const [rank, setRank] = useState(submission?.rank?.toString() ?? "");
  const [recommended, setRecommended] = useState(submission?.recommended ?? false);
  const [notes, setNotes] = useState(submission?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        tendererName: tendererName.trim(),
        dateReceived: dateReceived ? new Date(dateReceived).toISOString() : null,
        tenderPrice: tenderPrice ? String(tenderPrice) : null,
        conforming: conforming === "" ? null : conforming === "yes",
        score: score ? String(score) : null,
        rank: rank || null,
        recommended,
        notes: notes.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save submission");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {submission ? "Edit Tender Submission" : "New Tender Submission"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{pkg.title}</p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
              {error}
            </div>
          )}

          <div>
            <label className={LABEL_CLASS}>Tenderer</label>
            <input
              required
              value={tendererName}
              onChange={(e) => setTendererName(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className={LABEL_CLASS}>Date Received</label>
              <input
                type="date"
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div className="min-w-0">
              <label className={LABEL_CLASS}>Tender Price ($, Excl. GST)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={tenderPrice}
                onChange={(e) => setTenderPrice(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label className={LABEL_CLASS}>Conforming</label>
              <select
                value={conforming}
                onChange={(e) => setConforming(e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">Not checked</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="min-w-0">
              <label className={LABEL_CLASS}>Score (/100)</label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div className="min-w-0">
              <label className={LABEL_CLASS}>Rank</label>
              <input
                type="number"
                min={1}
                step={1}
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={recommended}
              onChange={(e) => setRecommended(e.target.checked)}
              className="h-4 w-4"
            />
            Recommended tenderer
          </label>

          <div>
            <label className={LABEL_CLASS}>Assessment Notes</label>
            <RichTextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Strengths, weaknesses, clarifications, departures"
              className={INPUT_CLASS}
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
              {saving ? "Saving…" : "Save Submission"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
