import { useState } from "react";
import { Link } from "react-router-dom";
import { Risk } from "../types";
import {
  ALL_CONSEQUENCES,
  ALL_LIKELIHOODS,
  CONSEQUENCE_LABELS,
  LIKELIHOOD_LABELS,
  riskBand,
  riskScore,
} from "../riskScoring";

// Band colours follow the status palette: each cell also shows its band in
// words on hover and its count as text, so colour never carries it alone.
const BAND_CELL: Record<string, string> = {
  Low: "bg-emerald-100 dark:bg-emerald-500/20",
  Medium: "bg-amber-100 dark:bg-amber-500/20",
  High: "bg-orange-200 dark:bg-orange-500/25",
  Critical: "bg-red-200 dark:bg-red-500/30",
};

// The 5×5 risk matrix: likelihood up the side (most likely at the top),
// consequence along the bottom, the number of open risks in each cell.
// Click a cell to list its risks. Inherent or residual rating.
export default function RiskHeatMap({ risks, showProject = false }: { risks: Risk[]; showProject?: boolean }) {
  const [mode, setMode] = useState<"inherent" | "residual">("inherent");
  const [picked, setPicked] = useState<string | null>(null);
  const open = risks.filter((r) => r.status !== "CLOSED");

  const cellOf = (r: Risk) => {
    const l = mode === "residual" ? r.residualLikelihood ?? r.inherentLikelihood : r.inherentLikelihood;
    const c = mode === "residual" ? r.residualConsequence ?? r.inherentConsequence : r.inherentConsequence;
    return `${l}|${c}`;
  };
  const byCell = new Map<string, Risk[]>();
  for (const r of open) {
    const k = cellOf(r);
    byCell.set(k, [...(byCell.get(k) ?? []), r]);
  }
  const pickedRisks = picked ? byCell.get(picked) ?? [] : [];

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Risk heat map <span className="font-normal text-slate-500 dark:text-slate-400">({open.length} open)</span>
        </h3>
        <div role="group" aria-label="Rating" className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
          {(["inherent", "residual"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => {
                setMode(m);
                setPicked(null);
              }}
              className={`px-2.5 py-1 rounded-md capitalize ${
                mode === m ? "bg-white dark:bg-slate-950 shadow-sm text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-300"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex items-center">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 [writing-mode:vertical-rl] rotate-180">Likelihood →</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-[6.5rem_repeat(5,minmax(0,1fr))] gap-1">
            {[...ALL_LIKELIHOODS].reverse().map((l) => (
              <div key={l} className="contents">
                <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-end pr-1 text-right leading-tight">
                  {LIKELIHOOD_LABELS[l]}
                </div>
                {ALL_CONSEQUENCES.map((c) => {
                  const k = `${l}|${c}`;
                  const count = byCell.get(k)?.length ?? 0;
                  const band = riskBand(riskScore(l, c));
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setPicked(picked === k ? null : k)}
                      disabled={count === 0}
                      title={`${LIKELIHOOD_LABELS[l]} × ${CONSEQUENCE_LABELS[c]}: ${band} — ${count} risk${count === 1 ? "" : "s"}`}
                      aria-label={`${LIKELIHOOD_LABELS[l]} likelihood, ${CONSEQUENCE_LABELS[c]} consequence, ${band}: ${count} risks`}
                      aria-pressed={picked === k}
                      className={`h-10 rounded-md text-sm font-semibold tabular-nums ${BAND_CELL[band]} ${
                        picked === k ? "ring-2 ring-blue-600" : ""
                      } ${count ? "text-slate-900 dark:text-slate-50 hover:ring-2 hover:ring-blue-400" : "text-transparent cursor-default"}`}
                    >
                      {count || "·"}
                    </button>
                  );
                })}
              </div>
            ))}
            <div />
            {ALL_CONSEQUENCES.map((c) => (
              <div key={c} className="text-[11px] text-center text-slate-600 dark:text-slate-300 leading-tight pt-1">
                {CONSEQUENCE_LABELS[c]}
              </div>
            ))}
          </div>
          <div className="text-[11px] text-center text-slate-500 dark:text-slate-400 mt-1">Consequence →</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-slate-600 dark:text-slate-300">
        {["Low", "Medium", "High", "Critical"].map((b) => (
          <span key={b} className="inline-flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded ${BAND_CELL[b]}`} /> {b}
          </span>
        ))}
      </div>
      {picked && (
        <ul className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
          {pickedRisks.map((r) => (
            <li key={r.id} className="text-sm">
              {showProject && r.project ? (
                <Link to={`/projects/${r.project.id}?tab=quality`} className="text-blue-700 dark:text-blue-300 hover:underline">
                  {r.title}
                </Link>
              ) : (
                <span className="text-slate-800 dark:text-slate-200">{r.title}</span>
              )}
              {showProject && r.project && <span className="text-xs text-slate-500 dark:text-slate-400"> · {r.project.name}</span>}
              {r.ownerName && <span className="text-xs text-slate-500 dark:text-slate-400"> · {r.ownerName}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
