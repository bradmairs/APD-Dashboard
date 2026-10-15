import { Link } from "react-router-dom";
import { DefectItem } from "../types";
import { DEFECT_STATUS_COLORS, DEFECT_STATUS_LABELS, defectStatusRank } from "../defectMeta";
import { formatDate } from "../format";

interface Props {
  defects: DefectItem[];
  limit?: number;
}

export default function OpenDefectsPanel({ defects, limit = 8 }: Props) {
  const openDefects = defects.filter((d) => d.status !== "VERIFIED");
  const topDefects = [...openDefects]
    .sort((a, b) => defectStatusRank(b.status) - defectStatusRank(a.status))
    .slice(0, limit);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Open Defects
        </h2>
        {openDefects.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {openDefects.length} outstanding portfolio-wide
          </span>
        )}
      </div>

      {topDefects.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No open defects across the portfolio.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {topDefects.map((defect) => (
            <li key={defect.id} className="py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${DEFECT_STATUS_COLORS[defect.status]}`}
                    >
                      {DEFECT_STATUS_LABELS[defect.status]}
                    </span>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {defect.title}
                    </span>
                    {defect.dueDate && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Due {formatDate(defect.dueDate)}
                      </span>
                    )}
                  </div>
                  {defect.project && (
                    <Link
                      to={`/projects/${defect.project.id}`}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5 inline-block"
                    >
                      {defect.project.name}
                    </Link>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
