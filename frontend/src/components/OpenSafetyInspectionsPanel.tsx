import { Link } from "react-router-dom";
import { SafetyInspection } from "../types";
import { SAFETY_INSPECTION_STATUS_COLORS, SAFETY_INSPECTION_STATUS_LABELS } from "../safetyInspectionMeta";

interface Props {
  inspections: SafetyInspection[];
  limit?: number;
}

export default function OpenSafetyInspectionsPanel({ inspections, limit = 8 }: Props) {
  const openInspections = inspections.filter((i) => i.status !== "CLOSED");
  const topInspections = [...openInspections]
    .sort((a, b) => (a.score ?? 100) - (b.score ?? 100))
    .slice(0, limit);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4 min-w-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Open Safety Inspections
        </h2>
        {openInspections.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {openInspections.length} open portfolio-wide
          </span>
        )}
      </div>

      {topInspections.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No open safety inspections across the portfolio.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {topInspections.map((inspection) => (
            <li key={inspection.id} className="py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {inspection.score !== null && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                      Score {inspection.score}
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${SAFETY_INSPECTION_STATUS_COLORS[inspection.status]}`}
                  >
                    {SAFETY_INSPECTION_STATUS_LABELS[inspection.status]}
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {inspection.inspectionType}
                  </span>
                </div>
                {inspection.project && (
                  <Link
                    to={`/projects/${inspection.project.id}`}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5 inline-block truncate"
                  >
                    {inspection.project.name}
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
