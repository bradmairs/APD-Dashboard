import { Link } from "react-router-dom";
import { Risk } from "../types";
import { riskBand, riskScore, RISK_BAND_COLORS } from "../riskScoring";
import { RISK_TYPE_COLORS, RISK_TYPE_LABELS } from "../riskMeta";

interface Props {
  risks: Risk[];
  limit?: number;
}

export default function TopRisksPanel({ risks, limit = 8 }: Props) {
  const openRisks = risks.filter((r) => r.status !== "CLOSED");
  const topRisks = [...openRisks]
    .sort(
      (a, b) =>
        riskScore(b.inherentLikelihood, b.inherentConsequence) -
        riskScore(a.inherentLikelihood, a.inherentConsequence)
    )
    .slice(0, limit);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Top Risks &amp; Opportunities
        </h2>
        {openRisks.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {openRisks.length} open portfolio-wide
          </span>
        )}
      </div>

      {topRisks.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No open risks or opportunities across the portfolio.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {topRisks.map((risk) => {
            const score = riskScore(risk.inherentLikelihood, risk.inherentConsequence);
            const band = riskBand(score);
            return (
              <li key={risk.id} className="py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_BAND_COLORS[band]}`}
                      >
                        {score}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${RISK_TYPE_COLORS[risk.type]}`}
                      >
                        {RISK_TYPE_LABELS[risk.type]}
                      </span>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {risk.title}
                      </span>
                    </div>
                    {risk.project && (
                      <Link
                        to={`/projects/${risk.project.id}`}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5 inline-block"
                      >
                        {risk.project.name}
                      </Link>
                    )}
                  </div>
                  {risk.ownerName && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 pt-0.5">
                      {risk.ownerName}
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
