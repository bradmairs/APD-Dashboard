import { Milestone } from "../types";
import { formatDate } from "../format";
import { Icon } from "./icons";

interface Item {
  label: string;
  icon: string;
  count: number;
  tab: string;
  section: string;
}

// A row of small tiles on a project: what's still open (click to jump to
// that list) and the next milestone with a countdown.
export default function ProjectOpenItems({
  items,
  milestones,
  onGo,
}: {
  items: Item[];
  milestones: Milestone[];
  onGo: (tab: string, section: string) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = milestones
    .filter((m) => !m.actualCompletion && (m.forecastedCompletion || m.originalCompletion))
    .map((m) => ({ m, due: new Date((m.forecastedCompletion || m.originalCompletion)!) }))
    .sort((a, b) => a.due.getTime() - b.due.getTime())[0];
  const days = next ? Math.round((next.due.getTime() - today.getTime()) / 86_400_000) : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          onClick={() => onGo(it.tab, it.section)}
          className="card card-hover p-3 flex items-center gap-3 text-left"
        >
          <span
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              it.count > 0 ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" : "bg-slate-100 text-slate-400 dark:bg-slate-800"
            }`}
          >
            <Icon name={it.icon} className="w-[18px] h-[18px]" />
          </span>
          <span>
            <span className="block text-xl font-semibold text-slate-900 dark:text-slate-100 leading-tight">{it.count}</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">{it.label}</span>
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={() => onGo("schedule", "milestones")}
        className="card card-hover p-3 flex items-center gap-3 text-left col-span-2 md:col-span-1"
      >
        <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <Icon name="flag" className="w-[18px] h-[18px]" />
        </span>
        <span className="min-w-0">
          {next ? (
            <>
              <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100 truncate" title={next.m.taskActivity}>
                {next.m.taskActivity}
              </span>
              <span className={`block text-xs ${days! < 0 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
                {days! < 0 ? `${-days!} days late` : days === 0 ? "Due today" : `In ${days} days`} · {formatDate(next.due.toISOString())}
              </span>
            </>
          ) : (
            <>
              <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">No upcoming milestone</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Add one on Schedule</span>
            </>
          )}
        </span>
      </button>
    </div>
  );
}
