import { FormEvent, useState } from "react";
import { PerformanceReview, PerformanceReviewInput } from "../types";
import { ALL_RATINGS, RATING_LABELS } from "../performanceMeta";

interface Props {
  item: PerformanceReview | null;
  onClose: () => void;
  onSave: (data: Partial<PerformanceReviewInput>) => Promise<void>;
}

function toDateInputValue(value: string | null): string {
  return value ? value.substring(0, 10) : "";
}

function RatingSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="min-w-0">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
      >
        {ALL_RATINGS.map((r) => (
          <option key={r} value={r}>
            {r} — {RATING_LABELS[r]}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function PerformanceReviewFormModal({ item, onClose, onSave }: Props) {
  const [revieweeName, setRevieweeName] = useState(item?.revieweeName ?? "");
  const [reviewPeriod, setReviewPeriod] = useState(item?.reviewPeriod ?? "");
  const [reviewDate, setReviewDate] = useState(
    toDateInputValue(item?.reviewDate ?? null) || new Date().toISOString().substring(0, 10)
  );
  const [qualityRating, setQualityRating] = useState(item?.qualityRating ?? 3);
  const [safetyRating, setSafetyRating] = useState(item?.safetyRating ?? 3);
  const [timelinessRating, setTimelinessRating] = useState(item?.timelinessRating ?? 3);
  const [communicationRating, setCommunicationRating] = useState(
    item?.communicationRating ?? 3
  );
  const [comments, setComments] = useState(item?.comments ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        revieweeName: revieweeName.trim(),
        reviewPeriod: reviewPeriod || null,
        reviewDate: new Date(reviewDate).toISOString(),
        qualityRating,
        safetyRating,
        timelinessRating,
        communicationRating,
        comments: comments || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save performance review");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {item ? "Edit Performance Review" : "New Performance Review"}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Consultant / Contractor
              </label>
              <input
                required
                value={revieweeName}
                onChange={(e) => setRevieweeName(e.target.value)}
                placeholder="Company or individual being reviewed"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Review Period
              </label>
              <input
                value={reviewPeriod}
                onChange={(e) => setReviewPeriod(e.target.value)}
                placeholder="e.g. Q3 2026"
                className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Review Date
            </label>
            <input
              type="date"
              required
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
              className="w-full sm:w-1/2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Ratings
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RatingSelect label="Quality" value={qualityRating} onChange={setQualityRating} />
              <RatingSelect label="Safety" value={safetyRating} onChange={setSafetyRating} />
              <RatingSelect
                label="Timeliness"
                value={timelinessRating}
                onChange={setTimelinessRating}
              />
              <RatingSelect
                label="Communication"
                value={communicationRating}
                onChange={setCommunicationRating}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Comments
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
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
