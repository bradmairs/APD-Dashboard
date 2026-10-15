import { Link } from "react-router-dom";
import { Subcontractor } from "../types";
import { formatDate } from "../format";
import {
  isSubcontractorInsuranceExpired,
  isSubcontractorInsuranceExpiringSoon,
} from "../subcontractorMeta";

interface Props {
  subcontractors: Subcontractor[];
  limit?: number;
}

export default function ExpiringSubcontractorInsurancePanel({
  subcontractors,
  limit = 8,
}: Props) {
  const flagged = subcontractors.filter(
    (s) => isSubcontractorInsuranceExpired(s) || isSubcontractorInsuranceExpiringSoon(s)
  );
  const sorted = [...flagged].sort(
    (a, b) => new Date(a.insuranceExpiry!).getTime() - new Date(b.insuranceExpiry!).getTime()
  );
  const topItems = sorted.slice(0, limit);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Subcontractor Insurance Expiring Soon
        </h2>
        {flagged.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {flagged.length} portfolio-wide
          </span>
        )}
      </div>

      {topItems.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No subcontractor insurance expiring soon across the portfolio.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {topItems.map((subcontractor) => {
            const expired = isSubcontractorInsuranceExpired(subcontractor);
            return (
              <li key={subcontractor.id} className="py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {subcontractor.companyName}
                    </span>
                    {subcontractor.project && (
                      <Link
                        to={`/projects/${subcontractor.project.id}`}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5 block"
                      >
                        {subcontractor.project.name}
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
                    {formatDate(subcontractor.insuranceExpiry)}
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
