import { Link } from "react-router-dom";
import { EnvironmentalMonitoringRecord } from "../types";
import { formatDate } from "../format";
import { isExceedance } from "../environmentalMeta";

interface Props {
  records: EnvironmentalMonitoringRecord[];
  limit?: number;
}

export default function EnvironmentalExceedancesPanel({ records, limit = 8 }: Props) {
  const exceedances = records.filter(isExceedance);
  const topRecords = [...exceedances]
    .sort((a, b) => new Date(b.monitoringDate).getTime() - new Date(a.monitoringDate).getTime())
    .slice(0, limit);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4 min-w-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Environmental Exceedances
        </h2>
        {exceedances.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {exceedances.length} portfolio-wide
          </span>
        )}
      </div>

      {topRecords.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No environmental monitoring exceedances across the portfolio.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {topRecords.map((record) => (
            <li key={record.id} className="py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                    Exceedance
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {record.parameter}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {record.readingValue} {record.unit} (limit{" "}
                  {record.limitType === "MAX" ? "≤" : "≥"} {record.limitValue} {record.unit}) ·{" "}
                  {formatDate(record.monitoringDate)}
                </div>
                {record.project && (
                  <Link
                    to={`/projects/${record.project.id}`}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5 inline-block truncate"
                  >
                    {record.project.name}
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
