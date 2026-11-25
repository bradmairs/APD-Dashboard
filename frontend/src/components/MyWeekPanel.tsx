import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ActionItem, InsuranceWarranty, PaymentClaim, Permit, Project, Task } from "../types";
import { useAuth } from "../auth/AuthContext";
import { formatCurrency, formatDate } from "../format";

interface Props {
  projects: Project[];
  tasks: Task[];
  actionItems: ActionItem[];
  permits: Permit[];
  insuranceWarranties: InsuranceWarranty[];
  paymentClaims: PaymentClaim[];
  onCompleteTask: (task: Task) => void;
  onCompleteAction: (actionItem: ActionItem) => void;
}

const DAY = 24 * 60 * 60 * 1000;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const card = "bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm";

// Everything that needs *you* this week, in one list: overdue and
// this-week tasks and actions on the projects you manage (or actions
// assigned to you anywhere), permits and insurance expiring within 30 days,
// and payment claims still waiting to be certified. Tick to complete.
export default function MyWeekPanel({
  projects,
  tasks,
  actionItems,
  permits,
  insuranceWarranties,
  paymentClaims,
  onCompleteTask,
  onCompleteAction,
}: Props) {
  const { user } = useAuth();

  const mine = useMemo(() => {
    const ids = new Set(
      projects
        .filter((p) => (user && p.projectManagerId === user.id) || (!!user?.name && p.projectManager === user.name))
        .map((p) => p.id)
    );
    return ids;
  }, [projects, user]);
  const projectName = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);

  const today = startOfToday();
  const weekEnd = new Date(today.getTime() + 7 * DAY);
  const monthEnd = new Date(today.getTime() + 30 * DAY);

  const due = [
    ...tasks
      .filter((t) => t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < weekEnd)
      .filter((t) => (t.projectId ? mine.has(t.projectId) : false))
      .map((t) => ({
        key: `t-${t.id}`,
        kind: "Task",
        title: t.title,
        dueDate: t.dueDate!,
        projectId: t.projectId,
        complete: () => onCompleteTask(t),
      })),
    ...actionItems
      .filter((a) => a.status !== "DONE" && a.dueDate && new Date(a.dueDate) < weekEnd)
      .filter((a) => mine.has(a.projectId) || (!!user?.name && a.ownerName === user.name))
      .map((a) => ({
        key: `a-${a.id}`,
        kind: a.type === "DECISION" ? "Decision" : "Action",
        title: a.title,
        dueDate: a.dueDate!,
        projectId: a.projectId as string | null,
        complete: () => onCompleteAction(a),
      })),
  ].sort((x, y) => x.dueDate.localeCompare(y.dueDate));

  const expiring = [
    ...permits
      .filter((p) => p.expiryDate && mine.has(p.projectId) && p.status !== "REJECTED")
      .map((p) => ({ key: `p-${p.id}`, kind: "Permit", title: p.title, date: p.expiryDate!, projectId: p.projectId })),
    ...insuranceWarranties
      .filter((i) => i.expiryDate && mine.has(i.projectId))
      .map((i) => ({ key: `i-${i.id}`, kind: "Insurance / warranty", title: i.title, date: i.expiryDate!, projectId: i.projectId })),
  ]
    .filter((x) => new Date(x.date) < monthEnd && new Date(x.date) >= new Date(today.getTime() - 30 * DAY))
    .sort((x, y) => x.date.localeCompare(y.date));

  const claims = paymentClaims
    .filter((c) => c.status === "SUBMITTED" && mine.has(c.projectId))
    .sort((x, y) => x.dateSubmitted.localeCompare(y.dateSubmitted));

  const nothing = due.length === 0 && expiring.length === 0 && claims.length === 0;

  return (
    <div className="space-y-6">
      {mine.size === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          You're not the project manager on any project, so only actions assigned to you by name show here.
        </p>
      )}
      {nothing && mine.size > 0 && (
        <div className={`${card} p-6 text-sm text-slate-600 dark:text-slate-300`}>
          Nothing needs you this week. 🎉
        </div>
      )}

      {due.length > 0 && (
        <section className={card} aria-labelledby="week-due">
          <h2 id="week-due" className="px-4 pt-4 pb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Overdue and due this week ({due.length})
          </h2>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {due.map((item) => {
              const overdue = new Date(item.dueDate) < today;
              return (
                <li key={item.key} className="px-4 py-2.5 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={item.complete}
                    title="Mark complete"
                    aria-label={`Mark "${item.title}" complete`}
                    className="h-4 w-4 mt-0.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-900 dark:text-slate-100">
                      <span className="text-xs text-slate-500 dark:text-slate-400 mr-2">{item.kind}</span>
                      {item.title}
                    </div>
                    {item.projectId && (
                      <Link to={`/projects/${item.projectId}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                        {projectName.get(item.projectId) ?? "Project"}
                      </Link>
                    )}
                  </div>
                  <span className={`text-xs whitespace-nowrap ${overdue ? "text-red-600 dark:text-red-400 font-medium" : "text-slate-500 dark:text-slate-400"}`}>
                    {overdue ? "Overdue · " : ""}
                    {formatDate(item.dueDate)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {expiring.length > 0 && (
          <section className={card} aria-labelledby="week-expiring">
            <h2 id="week-expiring" className="px-4 pt-4 pb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Expiring within 30 days ({expiring.length})
            </h2>
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {expiring.map((x) => {
                const expired = new Date(x.date) < today;
                return (
                  <li key={x.key} className="px-4 py-2.5 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-900 dark:text-slate-100">
                        <span className="text-xs text-slate-500 dark:text-slate-400 mr-2">{x.kind}</span>
                        {x.title}
                      </div>
                      <Link to={`/projects/${x.projectId}?tab=budget`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                        {projectName.get(x.projectId) ?? "Project"}
                      </Link>
                    </div>
                    <span className={`text-xs whitespace-nowrap ${expired ? "text-red-600 dark:text-red-400 font-medium" : "text-amber-600 dark:text-amber-400"}`}>
                      {expired ? "Expired " : "Expires "}
                      {formatDate(x.date)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {claims.length > 0 && (
          <section className={card} aria-labelledby="week-claims">
            <h2 id="week-claims" className="px-4 pt-4 pb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Payment claims awaiting certification ({claims.length})
            </h2>
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {claims.map((c) => (
                <li key={c.id} className="px-4 py-2.5 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-900 dark:text-slate-100">
                      Claim {c.claimNumber} · {formatCurrency(c.claimedAmount)}
                    </div>
                    <Link to={`/projects/${c.projectId}?tab=budget`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                      {projectName.get(c.projectId) ?? "Project"}
                    </Link>
                  </div>
                  <span className="text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">
                    Submitted {formatDate(c.dateSubmitted)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
