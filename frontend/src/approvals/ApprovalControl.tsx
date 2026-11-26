import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cancelApproval, getUserOptions, requestApproval } from "../api";
import { ApprovalEntityType, UserOption } from "../types";
import { useAuth } from "../auth/AuthContext";
import { formatDate } from "../format";
import { Icon } from "../components/icons";
import { approvalsChanged, useProjectApprovals } from "./useApprovals";

// On a variation or payment claim row: its latest approval (waiting on,
// approved by, rejected by), and "Request approval" to send it to someone.
export default function ApprovalControl({
  projectId,
  entityType,
  entityId,
}: {
  projectId: string;
  entityType: ApprovalEntityType;
  entityId: string;
}) {
  const { user, isViewer } = useAuth();
  const all = useProjectApprovals(projectId);
  const mine = all.filter((a) => a.entityType === entityType && a.entityId === entityId);
  const latest = mine.find((a) => a.status !== "CANCELLED");
  const [open, setOpen] = useState(false);

  async function withdraw() {
    if (!latest) return;
    await cancelApproval(latest.id);
    approvalsChanged(projectId);
  }

  const badge = latest
    ? latest.status === "PENDING"
      ? { text: `Awaiting ${latest.approverName}`, cls: "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300", icon: "clock" }
      : latest.status === "APPROVED"
        ? { text: `Approved by ${latest.approverName}`, cls: "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300", icon: "checkCircle" }
        : { text: `Rejected by ${latest.approverName}`, cls: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300", icon: "x" }
    : null;

  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      {badge && (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 ${badge.cls}`}
          title={[
            `Asked by ${latest!.requestedByName} on ${formatDate(latest!.createdAt)}`,
            latest!.note ? `Note: ${latest!.note}` : "",
            latest!.decidedAt ? `Decided ${formatDate(latest!.decidedAt)}` : "",
            latest!.decisionComment ? `"${latest!.decisionComment}"` : "",
          ]
            .filter(Boolean)
            .join("\n")}
        >
          <Icon name={badge.icon} className="w-3 h-3" />
          {badge.text}
        </span>
      )}
      {!isViewer && (!latest || latest.status !== "PENDING") && (
        <button type="button" onClick={() => setOpen(true)} className="text-[11px] text-blue-700 dark:text-blue-300 hover:underline">
          {latest ? "Ask again" : "Request approval"}
        </button>
      )}
      {latest?.status === "PENDING" && (latest.requestedById === user?.id || user?.role === "ADMIN") && (
        <button type="button" onClick={withdraw} className="text-[11px] text-slate-500 hover:underline">
          Withdraw
        </button>
      )}
      {open &&
        createPortal(
          <RequestDialog
            onClose={() => setOpen(false)}
            onSend={async (approverId, note) => {
              await requestApproval({ entityType, entityId, approverId, note });
              approvalsChanged(projectId);
              setOpen(false);
            }}
          />,
          document.body
        )}
    </span>
  );
}

function RequestDialog({ onClose, onSend }: { onClose: () => void; onSend: (approverId: string, note: string) => Promise<void> }) {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [approverId, setApproverId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const first = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    getUserOptions()
      .then((u) => setUsers(u.filter((x) => x.id !== user?.id)))
      .catch(() => setUsers([]));
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, user?.id]);
  return (
    <div className="fixed inset-0 bg-navy-800/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50 animate-fade-in" onMouseDown={onClose}>
      <form
        role="dialog"
        aria-label="Request approval"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!approverId) return;
          setSaving(true);
          setError(null);
          try {
            await onSend(approverId, note);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't send it");
          } finally {
            setSaving(false);
          }
        }}
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4 animate-pop-in"
      >
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Request approval</h2>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <label className="block text-sm">
          <span className="text-slate-700 dark:text-slate-300">Who approves it?</span>
          <select
            ref={first}
            required
            value={approverId}
            onChange={(e) => setApproverId(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm"
          >
            <option value="">Choose a person…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-slate-700 dark:text-slate-300">Note (optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm"
          />
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400">They'll see it under Approvals and in their notifications.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200">
            Cancel
          </button>
          <button type="submit" disabled={!approverId || saving} className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
