import { Link } from "react-router-dom";
import { Rfi } from "../types";
import { formatDate } from "../format";
import { isRfiOverdue } from "../rfiMeta";

interface Props {
  rfis: Rfi[];
  limit?: number;
}

export default function OpenRfisPanel({ rfis, limit = 8 }: Props) {
  const openRfis = rfis.filter((r) => r.status !== "CLOSED");
  const topRfis = [...openRfis]
    .sort((a, b) => {
      const aOverdue = isRfiOverdue(a);
      const bOverdue = isRfiOverdue(b);
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      if (!a.dateRequired) return 1;
      if (!b.dateRequired) return -1;
      return new Date(a.dateRequired).getTime() - new Date(b.dateRequired).getTime();
    })
    .slice(0, limit);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Open RFIs</h2>
        {openRfis.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {openRfis.length} open portfolio-wide
          </span>
        )}
      </div>

      {topRfis.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No open RFIs across the portfolio.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {topRfis.map((rfi) => {
            const overdue = isRfiOverdue(rfi);
            return (
              <li key={rfi.id} className="py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {rfi.rfiNumber}: {rfi.subject}
                      </span>
                    </div>
                    {rfi.project && (
                      <Link
                        to={`/projects/${rfi.project.id}`}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5 inline-block"
                      >
                        {rfi.project.name}
                      </Link>
                    )}
                  </div>
                  {rfi.dateRequired && (
                    <span
                      className={`text-xs shrink-0 font-medium ${
                        overdue
                          ? "text-red-600 dark:text-red-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {overdue ? "Overdue " : "Due "}
                      {formatDate(rfi.dateRequired)}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
