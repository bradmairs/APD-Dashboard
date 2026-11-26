import { batched } from "../batch";
import { getApprovals, getMentions, getReportStatus, updateNotificationState } from "../api";
import { ApprovalRequest, RecordComment, ReportStatus } from "../types";
import { currentMonthKey } from "./DashboardWidgets";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAllInsuranceWarranties,
  getAllPermits,
  getAllRfis,
  getProjects,
  getUpcomingTasks,
} from "../api";
import { InsuranceWarranty, Permit, Rfi, Task } from "../types";
import { useAuth } from "../auth/AuthContext";
import { formatDate } from "../format";
import { isTaskDueSoon, isTaskOverdue } from "../taskMeta";
import { isPermitExpired, isPermitExpiringSoon } from "../permitMeta";
import {
  isInsuranceWarrantyExpired,
  isInsuranceWarrantyExpiringSoon,
} from "../insuranceWarrantyMeta";
import { isRfiDueSoon, isRfiOverdue } from "../rfiMeta";

interface NotificationItem {
  key: string;
  kind: "Task" | "Permit" | "Insurance" | "Warranty" | "RFI" | "Mention" | "Approval" | "Report";
  title: string;
  date: string;
  overdue: boolean;
  project?: { id: string; name: string };
  // Where clicking it goes (defaults to the project).
  href?: string;
  detail?: string;
}

// Read and snoozed notifications, saved on the user's account so they
// follow them across devices: { [key]: "read" | ISO date snoozed until }.
type NotificationState = Record<string, string>;

// Only the signed-in user's own projects (the ones they're the linked Project
// Manager of) raise notifications, plus portfolio-wide tasks, which belong to
// no project. Mirrors digestItemsForUser in backend/src/digest.ts.
export default function NotificationBell() {
  const { user } = useAuth();
  const [myProjectIds, setMyProjectIds] = useState<Set<string>>(new Set());
  const [allTasks, setTasks] = useState<Task[]>([]);
  const [allPermits, setPermits] = useState<Permit[]>([]);
  const [allInsuranceWarranties, setInsuranceWarranties] = useState<InsuranceWarranty[]>([]);
  const [allRfis, setRfis] = useState<Rfi[]>([]);
  const [open, setOpen] = useState(false);
  const { refreshUser } = useAuth();
  const [mentions, setMentions] = useState<RecordComment[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [reportsMissing, setReportsMissing] = useState<ReportStatus[]>([]);
  const [state, setState] = useState<NotificationState>(() => (user?.notificationState as NotificationState) ?? {});
  useEffect(() => setState((user?.notificationState as NotificationState) ?? {}), [user?.notificationState]);
  useEffect(() => {
    if (!user) return;
    getMentions().then(setMentions).catch(() => setMentions([]));
    getApprovals({ mine: "pending" }).then(setApprovals).catch(() => setApprovals([]));
    if (new Date().getDate() >= 22) {
      getReportStatus(currentMonthKey())
        .then((rows) => setReportsMissing(rows.filter((r) => !r.hasReport && r.projectManagerId === user.id)))
        .catch(() => setReportsMissing([]));
    }
  }, [user?.id]);
  const saveTimer = useRef<number | null>(null);
  function changeState(next: NotificationState) {
    // Forget entries for notifications that are long gone (keeps it small).
    const pruned = Object.fromEntries(Object.entries(next).slice(-400));
    setState(pruned);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      updateNotificationState(pruned).then(() => refreshUser()).catch(() => undefined);
    }, 500);
  }
  const rootRef = useRef<HTMLDivElement>(null);
  // Close when clicking anywhere else on the page.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    // One request for all five lists (see batch.ts); drawn from the page
    // cache when it's fresh.
    batched(async () => {
    getProjects()
      .then((projects) =>
        setMyProjectIds(
          new Set(projects.filter((p) => p.projectManagerId === user?.id).map((p) => p.id))
        )
      )
      .catch(() => setMyProjectIds(new Set()));
    getUpcomingTasks()
      .then(setTasks)
      .catch(() => setTasks([]));
    getAllPermits()
      .then(setPermits)
      .catch(() => setPermits([]));
    getAllInsuranceWarranties()
      .then(setInsuranceWarranties)
      .catch(() => setInsuranceWarranties([]));
    getAllRfis()
      .then(setRfis)
      .catch(() => setRfis([]));
    }, { preferCache: true });
  }, [user?.id]);

  function isMine(item: { projectId?: string | null; project?: { id: string } | null }) {
    const projectId = item.project?.id ?? item.projectId ?? null;
    return projectId === null || myProjectIds.has(projectId);
  }
  const tasks = allTasks.filter(isMine);
  const permits = allPermits.filter(isMine);
  const insuranceWarranties = allInsuranceWarranties.filter(isMine);
  const rfis = allRfis.filter(isMine);

  const overdueTasks = tasks.filter(isTaskOverdue);
  const dueSoonTasks = tasks.filter((t) => isTaskDueSoon(t) && !isTaskOverdue(t));

  const flaggedPermits = permits.filter((p) => isPermitExpired(p) || isPermitExpiringSoon(p));
  const flaggedInsuranceWarranties = insuranceWarranties.filter(
    (i) => isInsuranceWarrantyExpired(i) || isInsuranceWarrantyExpiringSoon(i)
  );
  const flaggedRfis = rfis.filter((r) => isRfiOverdue(r) || isRfiDueSoon(r));

  const overdueCount =
    overdueTasks.length +
    flaggedPermits.filter(isPermitExpired).length +
    flaggedInsuranceWarranties.filter(isInsuranceWarrantyExpired).length +
    flaggedRfis.filter(isRfiOverdue).length;
  const dueSoonCount =
    dueSoonTasks.length +
    flaggedPermits.filter((p) => !isPermitExpired(p)).length +
    flaggedInsuranceWarranties.filter((i) => !isInsuranceWarrantyExpired(i)).length +
    flaggedRfis.filter((r) => !isRfiOverdue(r)).length;
  const notifyCount = overdueCount + dueSoonCount;

  const badgeColor = overdueCount > 0 ? "bg-red-600" : dueSoonCount > 0 ? "bg-amber-500" : null;

  const allItems: NotificationItem[] = [
    ...tasks.map((t) => ({
      key: `task-${t.id}`,
      kind: "Task" as const,
      title: t.title,
      date: t.dueDate!,
      overdue: isTaskOverdue(t),
      project: t.project,
    })),
    ...flaggedPermits.map((p) => ({
      key: `permit-${p.id}`,
      kind: "Permit" as const,
      title: p.title,
      date: p.expiryDate!,
      overdue: isPermitExpired(p),
      project: p.project,
    })),
    ...flaggedInsuranceWarranties.map((i) => ({
      key: `insurance-${i.id}`,
      kind: i.type === "WARRANTY" ? ("Warranty" as const) : ("Insurance" as const),
      title: i.title,
      date: i.expiryDate!,
      overdue: isInsuranceWarrantyExpired(i),
      project: i.project,
    })),
    ...flaggedRfis.map((r) => ({
      key: `rfi-${r.id}`,
      kind: "RFI" as const,
      title: `${r.rfiNumber}: ${r.subject}`,
      date: r.dateRequired!,
      overdue: isRfiOverdue(r),
      project: r.project,
    })),
    ...approvals.map((a) => ({
      key: `approval-${a.id}`,
      kind: "Approval" as const,
      title: `Approve ${a.entityLabel}`,
      detail: `Asked by ${a.requestedByName}`,
      date: a.createdAt,
      overdue: false,
      project: a.project,
      href: "/approvals",
    })),
    ...mentions.map((c) => ({
      key: `mention-${c.id}`,
      kind: "Mention" as const,
      title: `${c.authorName} mentioned you on ${c.entityLabel}`,
      detail: c.body.length > 90 ? `${c.body.slice(0, 90)}…` : c.body,
      date: c.createdAt,
      overdue: false,
      project: c.project,
    })),
    ...reportsMissing.map((r) => ({
      key: `report-${currentMonthKey()}-${r.projectId}`,
      kind: "Report" as const,
      title: "This month's report isn't started",
      date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
      overdue: false,
      project: { id: r.projectId, name: r.projectName },
      href: `/projects/${r.projectId}?tab=monthly-reporting`,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const now = Date.now();
  const visible = allItems.filter((i) => {
    const v = state[i.key];
    return !(v && v !== "read" && new Date(v).getTime() > now);
  });
  const isRead = (i: NotificationItem) => state[i.key] === "read";
  const unread = visible.filter((i) => !isRead(i));
  const snoozedCount = allItems.length - visible.length;
  const items = visible;
  const unreadOverdue = unread.filter((i) => i.overdue).length;
  const badgeCount = unread.length;
  const badgeTone = unreadOverdue > 0 ? "bg-red-600" : badgeCount > 0 ? "bg-blue-600" : null;

  function markRead(key: string) {
    changeState({ ...state, [key]: "read" });
  }
  function snooze(key: string, days: number) {
    const until = new Date();
    until.setDate(until.getDate() + days);
    changeState({ ...state, [key]: until.toISOString() });
  }
  function markAllRead() {
    const next = { ...state };
    for (const i of unread) next[i.key] = "read";
    changeState(next);
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300"
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path d="M12 2a6 6 0 0 0-6 6v3.09c0 .59-.24 1.16-.67 1.58L4 14v1h16v-1l-1.33-1.33a2.25 2.25 0 0 1-.67-1.58V8a6 6 0 0 0-6-6Zm0 20a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Z" />
        </svg>
        {badgeTone && (
          <span
            className={`absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full text-white text-[10px] leading-4 text-center font-medium ${badgeTone}`}
          >
            {badgeCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="menu-panel !py-0 absolute right-0 top-full mt-2 w-80 z-20">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {unread.length} unread{snoozedCount > 0 ? ` · ${snoozedCount} snoozed` : ""}
                </p>
              </div>
              {unread.length > 0 && (
                <button type="button" onClick={markAllRead} className="text-xs text-blue-700 dark:text-blue-300 hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">You're all caught up.</p>
            ) : (
              <ul className="max-h-[26rem] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                {items.map((item) => {
                  const read = isRead(item);
                  const href = item.href ?? (item.project ? `/projects/${item.project.id}` : undefined);
                  return (
                    <li key={item.key} className={`group px-4 py-2.5 text-sm ${read ? "opacity-60" : ""}`}>
                      <div className="flex items-start gap-2">
                        {!read && <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-600 shrink-0" aria-label="Unread" />}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                              {item.kind}
                            </span>
                            {href ? (
                              <Link
                                to={href}
                                onClick={() => {
                                  markRead(item.key);
                                  setOpen(false);
                                }}
                                className="text-slate-900 dark:text-slate-100 truncate hover:underline"
                              >
                                {item.title}
                              </Link>
                            ) : (
                              <span className="text-slate-900 dark:text-slate-100 truncate">{item.title}</span>
                            )}
                          </div>
                          {item.detail && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{item.detail}</div>}
                          <div className="flex items-center justify-between mt-0.5 gap-2">
                            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.project?.name}</span>
                            <span
                              className={`text-xs whitespace-nowrap ${
                                item.overdue ? "text-red-600 dark:text-red-400 font-medium" : "text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              {item.overdue ? "Overdue · " : ""}
                              {formatDate(item.date)}
                            </span>
                          </div>
                          <div className="flex gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                            {!read && (
                              <button type="button" onClick={() => markRead(item.key)} className="hover:underline">
                                Mark read
                              </button>
                            )}
                            <button type="button" onClick={() => snooze(item.key, 1)} className="hover:underline">
                              Snooze a day
                            </button>
                            <button type="button" onClick={() => snooze(item.key, 7)} className="hover:underline">
                              Snooze a week
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
