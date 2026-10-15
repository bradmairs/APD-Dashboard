import { Link } from "react-router-dom";
import { Correspondence } from "../types";
import { formatDate } from "../format";
import { isCorrespondenceOverdue } from "../correspondenceMeta";

interface Props {
  items: Correspondence[];
  limit?: number;
}

export default function OpenCorrespondencePanel({ items, limit = 8 }: Props) {
  const open = items.filter((i) => i.status !== "CLOSED");
  const top = [...open]
    .sort((a, b) => {
      const aOverdue = isCorrespondenceOverdue(a);
      const bOverdue = isCorrespondenceOverdue(b);
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      if (!a.responseDueDate) return 1;
      if (!b.responseDueDate) return -1;
      return new Date(a.responseDueDate).getTime() - new Date(b.responseDueDate).getTime();
    })
    .slice(0, limit);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Open Correspondence
        </h2>
        {open.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {open.length} open portfolio-wide
          </span>
        )}
      </div>

      {top.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No open correspondence across the portfolio.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {top.map((item) => {
            const overdue = isCorrespondenceOverdue(item);
            return (
              <li key={item.id} className="py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {item.reference ? `${item.reference}: ` : ""}
                        {item.subject}
                      </span>
                    </div>
                    {item.project && (
                      <Link
                        to={`/projects/${item.project.id}`}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5 inline-block"
                      >
                        {item.project.name}
                      </Link>
                    )}
                  </div>
                  {item.responseDueDate && (
                    <span
                      className={`text-xs shrink-0 font-medium ${
                        overdue
                          ? "text-red-600 dark:text-red-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {overdue ? "Overdue " : "Due "}
                      {formatDate(item.responseDueDate)}
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
