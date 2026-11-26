import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cancelApproval, decideApproval, getApprovals } from "../api";
import { ApprovalRequest } from "../types";
import { formatCurrency, formatDate } from "../format";
import AppLayout from "../components/AppLayout";
import EmptyState from "../components/EmptyState";
import { SkeletonSections } from "../components/Skeleton";
import { approvalsChanged } from "../approvals/useApprovals";
import { useAuth } from "../auth/AuthContext";

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Waiting", cls: "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
  APPROVED: { label: "Approved", cls: "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
  REJECTED: { label: "Rejected", cls: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300" },
  CANCELLED: { label: "Withdrawn", cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
};

function hrefFor(a: ApprovalRequest) {
  return `/projects/${a.projectId}?tab=budget`;
}

// Approvals: what's waiting on you to approve or reject, and the requests
// you've sent (with their outcome). Every decision is kept as a record.
export default function ApprovalsPage() {
  const { user } = useAuth();
  const [waiting, setWaiting] = useState<ApprovalRequest[] | null>(null);
  const [sent, setSent] = useState<ApprovalRequest[] | null>(null);

  async function load() {
    const [w, s] = await Promise.all([getApprovals({ mine: "pending" }), getApprovals({ mine: "requested" })]);
    setWaiting(w);
    setSent(s);
  }
  useEffect(() => {
    load().catch(() => {
      setWaiting([]);
      setSent([]);
    });
  }, []);

  async function changed(a: ApprovalRequest) {
    approvalsChanged(a.projectId);
    await load();
  }

  return (
    <AppLayout title="Approvals" subtitle="Variations and payment claims sent for approval">
      {waiting === null || sent === null ? (
        <SkeletonSections />
      ) : (
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6 items-start">
          <section className="card p-4" aria-labelledby="ap-waiting">
            <h2 id="ap-waiting" className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Waiting on you ({waiting.length})
            </h2>
            {waiting.length === 0 ? (
              <EmptyState icon="checkCircle" text="Nothing is waiting on your approval." />
            ) : (
              <ul className="space-y-3">
                {waiting.map((a) => (
                  <DecideRow key={a.id} approval={a} onDone={() => changed(a)} />
                ))}
              </ul>
            )}
          </section>

          <section className="card p-4" aria-labelledby="ap-sent">
            <h2 id="ap-sent" className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              You asked ({sent.length})
            </h2>
            {sent.length === 0 ? (
              <EmptyState icon="inbox" text="Request approval from a variation or payment claim's row, on its project's Budget & Contract tab." />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {sent.map((a) => (
                  <li key={a.id} className="py-2.5 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <Link to={hrefFor(a)} className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:underline">
                        {a.entityLabel}
                      </Link>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {a.project?.name} · to {a.approverName} · {formatDate(a.createdAt)}
                        {a.decisionComment && <> · “{a.decisionComment}”</>}
                      </div>
                    </div>
                    <span className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${STATUS[a.status].cls}`}>{STATUS[a.status].label}</span>
                    {a.status === "PENDING" && (a.requestedById === user?.id || user?.role === "ADMIN") && (
                      <button
                        type="button"
                        onClick={async () => {
                          await cancelApproval(a.id);
                          await changed(a);
                        }}
                        className="text-xs text-slate-500 hover:underline"
                      >
                        Withdraw
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AppLayout>
  );
}

function DecideRow({ approval: a, onDone }: { approval: ApprovalRequest; onDone: () => void }) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function decide(decision: "APPROVED" | "REJECTED") {
    setBusy(true);
    setError(null);
    try {
      await decideApproval(a.id, decision, comment);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the decision");
    } finally {
      setBusy(false);
    }
  }
  return (
    <li className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={hrefFor(a)} className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:underline">
            {a.entityLabel}
          </Link>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {a.project?.name} · asked by {a.requestedByName} on {formatDate(a.createdAt)}
          </div>
          {a.note && <p className="text-sm text-slate-700 dark:text-slate-300 mt-1.5">“{a.note}”</p>}
        </div>
        {a.amount !== null && <div className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(a.amount)}</div>}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="Comment (needed to reject)"
        aria-label={`Comment on ${a.entityLabel}`}
        className="mt-2 w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm"
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}
      <div className="flex justify-end gap-2 mt-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => decide("REJECTED")}
          className="px-3 py-1.5 text-sm rounded-lg border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
        >
          Reject
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => decide("APPROVED")}
          className="px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Approve
        </button>
      </div>
    </li>
  );
}
