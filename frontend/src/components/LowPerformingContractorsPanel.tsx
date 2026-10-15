import { Link } from "react-router-dom";
import { PerformanceReview } from "../types";
import { formatDate } from "../format";
import { isLowPerforming, overallScore } from "../performanceMeta";

interface Props {
  reviews: PerformanceReview[];
  limit?: number;
}

export default function LowPerformingContractorsPanel({ reviews, limit = 8 }: Props) {
  const flagged = reviews.filter(isLowPerforming);
  const sorted = [...flagged].sort((a, b) => overallScore(a) - overallScore(b));
  const topItems = sorted.slice(0, limit);

  return (
    <div className="min-w-0 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Low Performing Contractors
        </h2>
        {flagged.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {flagged.length} portfolio-wide
          </span>
        )}
      </div>

      {topItems.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No low-scoring performance reviews across the portfolio.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {topItems.map((review) => {
            const score = overallScore(review);
            return (
              <li key={review.id} className="py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {review.revieweeName}
                    </div>
                    {review.project && (
                      <Link
                        to={`/projects/${review.project.id}`}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5 block truncate"
                      >
                        {review.project.name}
                      </Link>
                    )}
                  </div>
                  <div className="text-xs shrink-0 text-right">
                    <div className="text-red-600 dark:text-red-400 font-medium">
                      {score.toFixed(1)} / 5
                    </div>
                    <div className="text-slate-400 dark:text-slate-500">
                      {formatDate(review.reviewDate)}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
