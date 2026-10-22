import { Link } from "react-router-dom";
import { TenderPackage } from "../types";
import { formatDate } from "../format";
import { TENDER_STATUS_COLORS, TENDER_STATUS_LABELS } from "../tenderMeta";

interface Props {
  tenderPackages: TenderPackage[];
  limit?: number;
}

export default function ActiveTendersPanel({ tenderPackages, limit = 8 }: Props) {
  const activePackages = tenderPackages.filter(
    (t) => t.status === "ISSUED" || t.status === "EVALUATION"
  );
  const topPackages = [...activePackages]
    .sort((a, b) => {
      if (!a.closingDate) return 1;
      if (!b.closingDate) return -1;
      return a.closingDate.localeCompare(b.closingDate);
    })
    .slice(0, limit);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4 min-w-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Active Tenders
        </h2>
        {activePackages.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {activePackages.length} active portfolio-wide
          </span>
        )}
      </div>

      {topPackages.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No tender packages currently issued or under evaluation.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {topPackages.map((tenderPackage) => (
            <li key={tenderPackage.id} className="py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${TENDER_STATUS_COLORS[tenderPackage.status]}`}
                  >
                    {TENDER_STATUS_LABELS[tenderPackage.status]}
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {tenderPackage.title}
                  </span>
                  {tenderPackage.closingDate && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Closes {formatDate(tenderPackage.closingDate)}
                    </span>
                  )}
                </div>
                {tenderPackage.project && (
                  <Link
                    to={`/projects/${tenderPackage.project.id}?tab=procurement`}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5 inline-block truncate"
                  >
                    {tenderPackage.project.name}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
