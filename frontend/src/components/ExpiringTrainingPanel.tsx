import { Link } from "react-router-dom";
import { TrainingRecord } from "../types";
import { formatDate } from "../format";
import { isTrainingExpired, isTrainingExpiringSoon } from "../trainingMeta";

interface Props {
  records: TrainingRecord[];
  limit?: number;
}

export default function ExpiringTrainingPanel({ records, limit = 8 }: Props) {
  const flagged = records.filter(
    (r) => isTrainingExpired(r) || isTrainingExpiringSoon(r)
  );
  const sorted = [...flagged].sort(
    (a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime()
  );
  const topItems = sorted.slice(0, limit);

  return (
    <div className="min-w-0 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Training Expiring Soon
        </h2>
        {flagged.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {flagged.length} portfolio-wide
          </span>
        )}
      </div>

      {topItems.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No training or induction records expiring soon across the portfolio.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {topItems.map((record) => {
            const expired = isTrainingExpired(record);
            return (
              <li key={record.id} className="py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {record.trainingType}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {record.personName}
                    </div>
                    {record.project && (
                      <Link
                        to={`/projects/${record.project.id}`}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5 block truncate"
                      >
                        {record.project.name}
                      </Link>
                    )}
                  </div>
                  <span
                    className={`text-xs shrink-0 font-medium ${
                      expired
                        ? "text-red-600 dark:text-red-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {expired ? "Expired " : "Expires "}
                    {formatDate(record.expiryDate)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
