import { useState } from "react";
import FormattedText from "./FormattedText";
import { ShowMoreButton, useShowMore } from "./CollapsibleSection";
import { PerformanceReview, PerformanceReviewInput } from "../types";
import { formatDate } from "../format";
import { overallScore, performanceBand, PERFORMANCE_BAND_COLORS } from "../performanceMeta";
import PerformanceReviewFormModal from "./PerformanceReviewFormModal";
import { useConfirm } from "../confirm/ConfirmContext";
import AutoExportCsvButton from "./AutoExportCsvButton";

interface Props {
  items: PerformanceReview[];
  onCreate: (data: Partial<PerformanceReviewInput>) => Promise<void>;
  onUpdate: (item: PerformanceReview, data: Partial<PerformanceReviewInput>) => Promise<void>;
  onDelete: (item: PerformanceReview) => Promise<void>;
}

function ScoreBadge({ score }: { score: number }) {
  const band = performanceBand(score);
  return (
    <span
      title={`Overall score: ${score.toFixed(1)} / 5`}
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${PERFORMANCE_BAND_COLORS[band]}`}
    >
      {band} ({score.toFixed(1)}/5)
    </span>
  );
}

export default function PerformanceReviewsPanel({ items, onCreate, onUpdate, onDelete }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PerformanceReview | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(item: PerformanceReview) {
    setEditing(item);
    setShowModal(true);
  }

  async function handleSave(data: Partial<PerformanceReviewInput>) {
    if (editing) {
      await onUpdate(editing, data);
    } else {
      await onCreate(data);
    }
    setShowModal(false);
    setEditing(null);
  }

  const confirm = useConfirm();

  async function handleDelete(item: PerformanceReview) {
    if (
      !await confirm(`Delete the performance review for "${item.revieweeName}"? This cannot be undone.`)
    ) {
      return;
    }
    await onDelete(item);
  }

  const sorted = [...items].sort((a, b) => overallScore(a) - overallScore(b));

  const shown = useShowMore(sorted);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Performance Reviews
        </h2>
        <div className="flex items-center gap-2">
          <AutoExportCsvButton filename="performance-reviews" rows={items} />
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Review
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No consultant or contractor performance reviews logged yet.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {shown.visible.map((item) => {
              const isExpanded = expandedId === item.id;
              const score = overallScore(item);
              return (
                <li key={item.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {item.revieweeName}
                        </span>
                        <ScoreBadge score={score} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        {item.reviewPeriod && <span>{item.reviewPeriod}</span>}
                        <span>Reviewed {formatDate(item.reviewDate)}</span>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <button
                        onClick={() => openEdit(item)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 space-y-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Quality
                          </div>
                          <div className="text-slate-700 dark:text-slate-300">
                            {item.qualityRating} / 5
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Safety
                          </div>
                          <div className="text-slate-700 dark:text-slate-300">
                            {item.safetyRating} / 5
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Timeliness
                          </div>
                          <div className="text-slate-700 dark:text-slate-300">
                            {item.timelinessRating} / 5
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Communication
                          </div>
                          <div className="text-slate-700 dark:text-slate-300">
                            {item.communicationRating} / 5
                          </div>
                        </div>
                      </div>
                      {item.comments && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Comments
                          </div>
                          <FormattedText className="text-slate-700 dark:text-slate-300" text={item.comments} />
                        </div>
                      )}
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        Reviewed by {item.reviewedByName}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <ShowMoreButton state={shown} noun="reviews" />
        </>
      )}

      {showModal && (
        <PerformanceReviewFormModal
          item={editing}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
