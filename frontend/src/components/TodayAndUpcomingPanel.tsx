import { Link } from "react-router-dom";
import { ActionItem, Task } from "../types";
import { ACTION_TYPE_COLORS, ACTION_TYPE_LABELS } from "../actionItemMeta";

type Bucket = "OVERDUE" | "TODAY" | "WEEK" | "LATER" | "NONE";

const BUCKET_ORDER: Bucket[] = ["OVERDUE", "TODAY", "WEEK", "LATER", "NONE"];

const BUCKET_LABELS: Record<Bucket, string> = {
  OVERDUE: "Overdue",
  TODAY: "Due Today",
  WEEK: "Due This Week",
  LATER: "Later",
  NONE: "No Due Date",
};

interface UnifiedItem {
  key: string;
  kind: "TASK" | "ACTION" | "DECISION";
  title: string;
  dueDate: string | null;
  project?: { id: string; name: string };
  ownerName?: string | null;
  onComplete: () => void;
  task?: Task;
  action?: ActionItem;
}

interface Props {
  tasks: Task[];
  actionItems: ActionItem[];
  onCompleteTask: (task: Task) => void;
  onCompleteAction: (actionItem: ActionItem) => void;
  onUpdateTaskDueDate: (task: Task, dueDate: string | null) => void;
  onUpdateActionDueDate: (actionItem: ActionItem, dueDate: string | null) => void;
}

function toDateInputValue(value: string | null): string {
  return value ? value.substring(0, 10) : "";
}

function dayStart(value: string | Date): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function bucketFor(dueDate: string | null, todayStart: Date, weekEnd: Date): Bucket {
  if (!dueDate) return "NONE";
  const d = dayStart(dueDate);
  if (d < todayStart) return "OVERDUE";
  if (d.getTime() === todayStart.getTime()) return "TODAY";
  if (d < weekEnd) return "WEEK";
  return "LATER";
}

const KIND_BADGE_COLORS: Record<UnifiedItem["kind"], string> = {
  TASK: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  ACTION: ACTION_TYPE_COLORS.ACTION,
  DECISION: ACTION_TYPE_COLORS.DECISION,
};

const KIND_BADGE_LABELS: Record<UnifiedItem["kind"], string> = {
  TASK: "Task",
  ACTION: ACTION_TYPE_LABELS.ACTION,
  DECISION: ACTION_TYPE_LABELS.DECISION,
};

// Merges portfolio-wide Tasks and Actions/Decisions into one prioritized,
// date-bucketed list — the single place to see and clear everything that's
// due, rather than checking a tasks panel and an actions panel separately.
export default function TodayAndUpcomingPanel({
  tasks,
  actionItems,
  onCompleteTask,
  onCompleteAction,
  onUpdateTaskDueDate,
  onUpdateActionDueDate,
}: Props) {
  const todayStart = dayStart(new Date());
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const openActionItems = actionItems.filter((a) => a.status !== "DONE");

  const items: UnifiedItem[] = [
    ...tasks.map((task) => ({
      key: `task-${task.id}`,
      kind: "TASK" as const,
      title: task.title,
      dueDate: task.dueDate,
      project: task.project,
      onComplete: () => onCompleteTask(task),
      task,
    })),
    ...openActionItems.map((actionItem) => ({
      key: `action-${actionItem.id}`,
      kind: (actionItem.type === "DECISION" ? "DECISION" : "ACTION") as UnifiedItem["kind"],
      title: actionItem.title,
      dueDate: actionItem.dueDate,
      project: actionItem.project,
      ownerName: actionItem.ownerName,
      onComplete: () => onCompleteAction(actionItem),
      action: actionItem,
    })),
  ];

  const buckets: Record<Bucket, UnifiedItem[]> = {
    OVERDUE: [],
    TODAY: [],
    WEEK: [],
    LATER: [],
    NONE: [],
  };
  for (const item of items) {
    buckets[bucketFor(item.dueDate, todayStart, weekEnd)].push(item);
  }
  for (const bucket of BUCKET_ORDER) {
    buckets[bucket].sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return a.title.localeCompare(b.title);
    });
  }

  const total = items.length;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Today &amp; Upcoming
        </h2>
        {total > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {buckets.OVERDUE.length} overdue · {total} open
          </span>
        )}
      </div>

      {total === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Nothing outstanding — no open tasks or actions across the portfolio.
        </p>
      ) : (
        <div className="space-y-5">
          {BUCKET_ORDER.filter((bucket) => buckets[bucket].length > 0).map((bucket) => (
            <div key={bucket}>
              <h3
                className={`text-xs font-semibold uppercase tracking-wide mb-2 ${
                  bucket === "OVERDUE"
                    ? "text-red-600 dark:text-red-400"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {BUCKET_LABELS[bucket]} ({buckets[bucket].length})
              </h3>
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {buckets[bucket].map((item) => (
                  <li key={item.key} className="py-2.5 flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={item.onComplete}
                      title="Mark complete"
                      className="h-4 w-4 mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${KIND_BADGE_COLORS[item.kind]}`}
                        >
                          {KIND_BADGE_LABELS[item.kind]}
                        </span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {item.title}
                        </span>
                      </div>
                      {item.project && (
                        <Link
                          to={
                            item.kind === "TASK"
                              ? `/projects/${item.project.id}?tab=schedule`
                              : `/projects/${item.project.id}`
                          }
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5 inline-block"
                        >
                          {item.project.name}
                        </Link>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <input
                        type="date"
                        value={toDateInputValue(item.dueDate)}
                        onChange={(e) => {
                          const dueDate = e.target.value ? new Date(e.target.value).toISOString() : null;
                          if (item.task) onUpdateTaskDueDate(item.task, dueDate);
                          else if (item.action) onUpdateActionDueDate(item.action, dueDate);
                        }}
                        title="Edit due date"
                        className={`text-xs rounded border px-1.5 py-1 dark:bg-slate-700 ${
                          bucket === "OVERDUE"
                            ? "border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 font-medium"
                            : "border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                        }`}
                      />
                      {item.ownerName && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {item.ownerName}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
