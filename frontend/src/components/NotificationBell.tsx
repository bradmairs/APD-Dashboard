import { useEffect, useState } from "react";
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
  kind: "Task" | "Permit" | "Insurance" | "Warranty" | "RFI";
  title: string;
  date: string;
  overdue: boolean;
  project?: { id: string; name: string };
}

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

  useEffect(() => {
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

  const items: NotificationItem[] = [
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
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
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
        {badgeColor && (
          <span
            className={`absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full text-white text-[10px] leading-4 text-center font-medium ${badgeColor}`}
          >
            {notifyCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 shadow-lg z-20">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Notifications
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                For projects where you're the Project Manager
              </p>
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                No upcoming deadlines or expirations on your projects.
              </p>
            ) : (
              <ul className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                {items.map((item) => (
                  <li key={item.key} className="px-4 py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 shrink-0">
                        {item.kind}
                      </span>
                      <span className="text-slate-900 dark:text-slate-100 truncate">
                        {item.title}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      {item.project && (
                        <Link
                          to={`/projects/${item.project.id}`}
                          onClick={() => setOpen(false)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {item.project.name}
                        </Link>
                      )}
                      <span
                        className={`text-xs ${
                          item.overdue
                            ? "text-red-600 dark:text-red-400 font-medium"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {formatDate(item.date)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
