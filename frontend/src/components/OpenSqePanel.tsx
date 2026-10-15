import { Link } from "react-router-dom";
import { SqeRecord } from "../types";
import {
  SQE_CATEGORY_COLORS,
  SQE_CATEGORY_LABELS,
  SQE_SEVERITY_COLORS,
  SQE_SEVERITY_LABELS,
  sqeSeverityRank,
} from "../sqeMeta";

interface Props {
  records: SqeRecord[];
  limit?: number;
}

export default function OpenSqePanel({ records, limit = 8 }: Props) {
  const openRecords = records.filter((r) => r.status !== "CLOSED");
  const topRecords = [...openRecords]
    .sort((a, b) => sqeSeverityRank(b.severity) - sqeSeverityRank(a.severity))
    .slice(0, limit);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Open SQE Issues
        </h2>
        {openRecords.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {openRecords.length} open portfolio-wide
          </span>
        )}
      </div>

      {topRecords.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No open safety, quality, or environmental issues across the portfolio.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {topRecords.map((record) => (
            <li key={record.id} className="py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${SQE_SEVERITY_COLORS[record.severity]}`}
                    >
                      {SQE_SEVERITY_LABELS[record.severity]}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${SQE_CATEGORY_COLORS[record.category]}`}
                    >
                      {SQE_CATEGORY_LABELS[record.category]}
                    </span>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {record.title}
                    </span>
                  </div>
                  {record.project && (
                    <Link
                      to={`/projects/${record.project.id}`}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5 inline-block"
                    >
                      {record.project.name}
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
