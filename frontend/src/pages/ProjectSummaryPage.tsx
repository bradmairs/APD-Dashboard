import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ActionItem, CashFlowEntry, EotClaim, Milestone, Project, Risk, Variation } from "../types";
import {
  getActionItems,
  getCashFlowEntries,
  getEotClaims,
  getMilestones,
  getProject,
  getRisks,
  getVariations,
} from "../api";
import { batched } from "../batch";
import { formatCurrency, formatDate } from "../format";
import { STATUS_LABELS } from "../statusMeta";
import { computeProjectHealth } from "../health";
import { RAG_LABELS } from "../ragMeta";
import { revisedCompletionDate } from "../eot";
import { approvedVariationsTotal, effectiveBudget } from "../variations";
import { riskBand, riskScore } from "../riskScoring";
import FormattedText from "../components/FormattedText";
import ProjectProgressStrip from "../components/ProjectProgressStrip";
import gvwLogo from "../assets/gvw-logo.png";

const RAG_STYLE: Record<string, string> = {
  GREEN: "bg-emerald-100 text-emerald-800",
  AMBER: "bg-amber-100 text-amber-800",
  RED: "bg-red-100 text-red-800",
};

// "Project on a page": one printable page for steering committees and
// sponsors. Status and health, time and budget, key dates, top risks, next
// milestones and recent decisions. Download as PDF or print.
export default function ProjectSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{
    project: Project;
    milestones: Milestone[];
    risks: Risk[];
    actions: ActionItem[];
    cash: CashFlowEntry[];
    variations: Variation[];
    eots: EotClaim[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // A paper page: always shown in light mode, whatever the app theme.
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => {
      if (wasDark) root.classList.add("dark");
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    batched(() =>
      Promise.all([
        getProject(id),
        getMilestones(id),
        getRisks(id),
        getActionItems(id),
        getCashFlowEntries(id),
        getVariations(id),
        getEotClaims(id),
      ])
    )
      .then(([project, milestones, risks, actions, cash, variations, eots]) =>
        setData({ project, milestones, risks, actions, cash, variations, eots })
      )
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load the project"));
  }, [id]);

  const health = useMemo(
    () => (data ? computeProjectHealth(data.project, data.cash, data.variations, data.risks, data.eots) : null),
    [data]
  );

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data || !health) return <div className="p-6 text-slate-500">Loading…</div>;
  const { project, milestones, risks, actions, cash, variations, eots } = data;

  const revised = revisedCompletionDate(project, eots);
  const budget = effectiveBudget(project, variations);
  const spent = cash.filter((e) => e.type === "ACTUAL").reduce((s, e) => s + Number(e.amount || 0), 0);
  const topRisks = risks
    .filter((r) => r.status !== "CLOSED")
    .map((r) => ({ r, score: riskScore(r.residualLikelihood ?? r.inherentLikelihood, r.residualConsequence ?? r.inherentConsequence) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const nextMilestones = milestones
    .filter((m) => !m.actualCompletion)
    .sort((a, b) => (a.forecastedCompletion ?? a.originalCompletion ?? "9").localeCompare(b.forecastedCompletion ?? b.originalCompletion ?? "9"))
    .slice(0, 5);
  const decisions = actions
    .filter((a) => a.type === "DECISION")
    .sort((a, b) => b.dateRaised.localeCompare(a.dateRaised))
    .slice(0, 4);
  const openActions = actions.filter((a) => a.type !== "DECISION" && a.status !== "DONE").length;

  async function download() {
    setExporting(true);
    try {
      const { downloadElementAsPdf } = await import("../pdfExport");
      await downloadElementAsPdf("summary-page", `${project.name} - Project Summary`);
    } finally {
      setExporting(false);
    }
  }

  const H = ({ children }: { children: string }) => (
    <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">{children}</h2>
  );

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="max-w-5xl mx-auto px-4 py-6 print:p-0 print:max-w-none">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Link to={`/projects/${project.id}`} className="text-sm text-blue-700 hover:underline">
            ← Back to {project.name}
          </Link>
          <div className="flex gap-2">
            <button
              onClick={download}
              disabled={exporting}
              className="px-4 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {exporting ? "Generating…" : "Download PDF"}
            </button>
            <button onClick={() => window.print()} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              Print
            </button>
          </div>
        </div>

        {/* Always light, like paper. */}
        <div id="summary-page" className="bg-white text-slate-900 rounded-xl shadow-sm p-8 print:shadow-none print:rounded-none print:p-4 space-y-5">
          <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-4">
            <div>
              <div className="text-xs text-slate-500">Project summary · {formatDate(new Date().toISOString())}</div>
              <h1 className="text-2xl font-semibold tracking-tight mt-0.5">{project.name}</h1>
              <div className="text-sm text-slate-600 mt-1">
                {[project.projectNumber, project.assetType, project.location].filter(Boolean).join(" · ")}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2 text-xs">
                <span className="rounded-full px-2 py-0.5 bg-slate-100 text-slate-700 font-medium">{STATUS_LABELS[project.status]}</span>
                {(["schedule", "budget", "risk"] as const).map((k) => (
                  <span key={k} className={`rounded-full px-2 py-0.5 font-medium ${RAG_STYLE[health[k]]}`}>
                    {k[0].toUpperCase() + k.slice(1)}: {RAG_LABELS[health[k]]}
                  </span>
                ))}
              </div>
            </div>
            <img src={gvwLogo} alt="Goulburn Valley Water" className="h-14 w-auto" />
          </header>

          <div className="grid grid-cols-3 gap-5 text-sm">
            <div>
              <H>People</H>
              <dl className="space-y-1">
                <div><dt className="inline text-slate-500">Manager: </dt><dd className="inline">{project.projectManager || "—"}</dd></div>
                <div><dt className="inline text-slate-500">Director: </dt><dd className="inline">{project.projectDirector || "—"}</dd></div>
                <div><dt className="inline text-slate-500">Sponsor: </dt><dd className="inline">{project.projectSponsor || "—"}</dd></div>
                <div><dt className="inline text-slate-500">Contractor: </dt><dd className="inline">{project.contractor || "—"}</dd></div>
              </dl>
            </div>
            <div>
              <H>Budget (excl. GST)</H>
              <dl className="space-y-1">
                <div><dt className="inline text-slate-500">Original: </dt><dd className="inline">{formatCurrency(project.budget)}</dd></div>
                <div><dt className="inline text-slate-500">Current: </dt><dd className="inline font-medium">{formatCurrency(budget)}</dd></div>
                <div><dt className="inline text-slate-500">Approved variations: </dt><dd className="inline">{formatCurrency(approvedVariationsTotal(variations))}</dd></div>
                <div><dt className="inline text-slate-500">Spent to date: </dt><dd className="inline">{formatCurrency(spent)}</dd></div>
              </dl>
            </div>
            <div>
              <H>Key dates</H>
              <dl className="space-y-1">
                <div><dt className="inline text-slate-500">Start: </dt><dd className="inline">{formatDate(project.startDate)}</dd></div>
                <div><dt className="inline text-slate-500">Target: </dt><dd className="inline">{formatDate(project.targetCompletionDate)}</dd></div>
                {revised && revised !== project.targetCompletionDate && (
                  <div><dt className="inline text-slate-500">Revised (EOT): </dt><dd className="inline">{formatDate(revised)}</dd></div>
                )}
                <div><dt className="inline text-slate-500">Actual: </dt><dd className="inline">{formatDate(project.actualCompletionDate)}</dd></div>
              </dl>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <ProjectProgressStrip project={project} cashFlowEntries={cash} revisedTargetCompletion={revised} />
          </div>

          {project.description && (
            <div>
              <H>About</H>
              <FormattedText className="text-sm text-slate-700" text={project.description} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-5">
            <div>
              <H>Top risks</H>
              {topRisks.length === 0 ? (
                <p className="text-sm text-slate-500">No open risks.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {topRisks.map(({ r, score }) => (
                    <li key={r.id} className="flex gap-2">
                      <span className="text-[11px] font-semibold rounded px-1.5 py-0.5 bg-slate-100 text-slate-700 shrink-0">{riskBand(score)}</span>
                      <span>
                        {r.title}
                        {r.ownerName && <span className="text-slate-500"> · {r.ownerName}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <H>Next milestones</H>
              {nextMilestones.length === 0 ? (
                <p className="text-sm text-slate-500">No upcoming milestones.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {nextMilestones.map((m) => (
                    <li key={m.id} className="flex justify-between gap-3">
                      <span>{m.taskActivity}</span>
                      <span className="text-slate-600 tabular-nums shrink-0">
                        {formatDate(m.forecastedCompletion ?? m.originalCompletion)} · {m.percentComplete}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <H>Recent decisions</H>
            {decisions.length === 0 ? (
              <p className="text-sm text-slate-500">No decisions recorded.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {decisions.map((d) => (
                  <li key={d.id}>
                    <span className="text-slate-500 tabular-nums">{formatDate(d.dateRaised)} · </span>
                    {d.title}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-slate-500 mt-2">{openActions} open action{openActions === 1 ? "" : "s"}.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
