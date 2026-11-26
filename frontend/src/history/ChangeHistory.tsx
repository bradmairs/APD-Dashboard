import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getHistory } from "../api";
import { FieldChange } from "../types";
import { formatCurrency, formatDate } from "../format";
import { STATUS_LABELS } from "../statusMeta";
import { Icon } from "../components/icons";

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  status: "Status",
  projectNumber: "Project number",
  bpRefNo: "BP ref.",
  assetType: "Asset type",
  projectManager: "Project manager",
  projectDirector: "Project director",
  projectSponsor: "Project sponsor",
  location: "Location",
  contractor: "Contractor",
  consultant: "Consultant",
  trimFolder: "TRIM folder",
  budget: "Original budget",
  latestApprovedBudget: "Latest approved budget",
  contingency: "Contingency",
  contractValue: "Contract value",
  startDate: "Start date",
  targetCompletionDate: "Target completion",
  actualCompletionDate: "Actual completion",
  reference: "Reference",
  title: "Title",
  category: "Category",
  costImpact: "Cost impact",
  timeImpactDays: "Time impact (days)",
  dateRaised: "Date raised",
  dateDecided: "Date decided",
  claimNumber: "Claim number",
  periodEnding: "Period ending",
  claimedAmount: "Claimed amount",
  certifiedAmount: "Certified amount",
  dateSubmitted: "Date submitted",
  dateCertified: "Date certified",
  datePaid: "Date paid",
  trimLink: "TRIM link",
  type: "Type",
  inherentLikelihood: "Likelihood",
  inherentConsequence: "Consequence",
  residualLikelihood: "Residual likelihood",
  residualConsequence: "Residual consequence",
  ownerName: "Owner",
  dueDate: "Due date",
};
const MONEY = new Set(["budget", "latestApprovedBudget", "contingency", "contractValue", "costImpact", "claimedAmount", "certifiedAmount"]);
const TYPE_LABELS: Record<string, string> = {
  project: "Project details",
  variation: "Variations",
  paymentClaim: "Payment claims",
  risk: "Risks",
};

function show(field: string, value: string | null) {
  if (value === null || value === "") return <span className="italic text-slate-500">blank</span>;
  if (MONEY.has(field) && !isNaN(Number(value))) return formatCurrency(Number(value));
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value);
  if (field === "status" && value in STATUS_LABELS) return STATUS_LABELS[value as keyof typeof STATUS_LABELS];
  return value.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

// "History" on a project: every recorded field change (project details,
// variations, payment claims, risks) with who changed it, when, and the old
// and new values.
export function ChangeHistoryButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 inline-flex items-center gap-1.5"
        title="Who changed what, and when"
      >
        <Icon name="clock" className="w-4 h-4" /> History
      </button>
      {open && createPortal(<HistoryDrawer projectId={projectId} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function HistoryDrawer({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [rows, setRows] = useState<FieldChange[] | null>(null);
  const [type, setType] = useState("");
  useEffect(() => {
    getHistory(projectId).then(setRows).catch(() => setRows([]));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [projectId, onClose]);
  const shown = (rows ?? []).filter((r) => !type || r.entityType === type);
  const days = new Map<string, FieldChange[]>();
  for (const r of shown) {
    const d = r.createdAt.substring(0, 10);
    days.set(d, [...(days.get(d) ?? []), r]);
  }
  return (
    <div className="fixed inset-0 bg-navy-800/40 backdrop-blur-[2px] flex justify-end z-50 animate-fade-in" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Change history"
        onMouseDown={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 shadow-xl w-full max-w-lg h-full flex flex-col animate-slide-in-right border-l border-slate-200 dark:border-slate-800"
      >
        <div className="flex items-center justify-between gap-3 p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Change history</h2>
          <div className="flex items-center gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              aria-label="Show changes to"
              className="text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-2 py-1"
            >
              <option value="">Everything</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
              <Icon name="x" className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {rows === null ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : shown.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No changes recorded yet. Edits to project details, variations, payment claims and risks are recorded from version 3.0 on.
            </p>
          ) : (
            Array.from(days.entries()).map(([day, list]) => (
              <div key={day} className="mb-5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">{formatDate(day)}</div>
                <ol className="space-y-2.5 border-l border-slate-200 dark:border-slate-700 ml-1.5">
                  {list.map((r) => (
                    <li key={r.id} className="pl-4 relative text-sm">
                      <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-900" />
                      <div className="text-slate-800 dark:text-slate-200">
                        <span className="font-medium">{FIELD_LABELS[r.field] ?? r.field}</span>
                        {r.entityType !== "project" && <span className="text-slate-500 dark:text-slate-400"> on {r.entityLabel}</span>}
                      </div>
                      <div className="text-slate-600 dark:text-slate-300">
                        {show(r.field, r.oldValue)} <span className="text-slate-500">→</span>{" "}
                        <span className="font-medium text-slate-900 dark:text-slate-100">{show(r.field, r.newValue)}</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {r.userName} · {new Date(r.createdAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
