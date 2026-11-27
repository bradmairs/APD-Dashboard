import { CashFlowEntry, Project } from "../types";
import { formatCurrency, formatDate } from "../format";
import { Icon } from "./icons";

interface Props {
  project: Project;
  cashFlowEntries: CashFlowEntry[];
  revisedTargetCompletion: string | null;
}

const DAY = 86_400_000;

// A meter: a single ratio against its limit. The fill carries severity
// (blue, then amber, then red past the limit); the track is a lighter step
// of the same colour. The figure is printed beside it, never colour alone.
function Meter({
  label,
  value,
  detail,
  severity,
}: {
  label: string;
  value: number | null;
  detail: string;
  severity: "ok" | "warn" | "bad";
}) {
  const fill = severity === "bad" ? "bg-red-500" : severity === "warn" ? "bg-amber-500" : "bg-blue-600 dark:bg-blue-400";
  const track = severity === "bad" ? "bg-red-100 dark:bg-red-500/15" : severity === "warn" ? "bg-amber-100 dark:bg-amber-500/15" : "bg-blue-100 dark:bg-blue-500/15";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{value === null ? "—" : `${value}%`}</span>
      </div>
      <div
        className={`mt-1.5 h-2 rounded-full overflow-hidden ${track}`}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value ?? 0}
      >
        {value !== null && <div className={`h-full rounded-full ${fill}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{detail}</div>
    </div>
  );
}

// The project at a glance: how much of the time has gone, how much of the
// budget has been spent, and the key dates on one line with "today".
export default function ProjectProgressStrip({ project, cashFlowEntries, revisedTargetCompletion }: Props) {
  const now = Date.now();
  const start = project.startDate ? new Date(project.startDate).getTime() : null;
  const finishIso = revisedTargetCompletion ?? project.targetCompletionDate;
  const finish = finishIso ? new Date(finishIso).getTime() : null;
  const done = !!project.actualCompletionDate;

  let timePct: number | null = null;
  let timeDetail = "Add a start date and approved completion target";
  if (done) {
    timePct = 100;
    timeDetail = `Completed ${formatDate(project.actualCompletionDate)}`;
  } else if (start && finish && finish > start) {
    timePct = Math.round(((now - start) / (finish - start)) * 100);
    const daysLeft = Math.ceil((finish - now) / DAY);
    timeDetail = daysLeft >= 0 ? `${daysLeft} days to ${formatDate(finishIso)}` : `${-daysLeft} days past ${formatDate(finishIso)}`;
  }

  const budget = Number(project.latestApprovedBudget ?? project.budget ?? 0);
  const spent = cashFlowEntries.filter((e) => e.type === "ACTUAL").reduce((s, e) => s + Number(e.amount || 0), 0);
  const budgetPct = budget > 0 ? Math.round((spent / budget) * 100) : null;
  const budgetDetail = budget > 0 ? `${formatCurrency(spent)} of ${formatCurrency(budget)}` : "No budget set";

  // Spending ahead of time is the warning sign.
  const budgetSeverity =
    budgetPct === null ? "ok" : budgetPct > 100 ? "bad" : timePct !== null && budgetPct > timePct + 15 ? "warn" : "ok";
  const timeSeverity = timePct !== null && timePct > 100 && !done ? "bad" : timePct !== null && timePct > 90 && !done ? "warn" : "ok";

  // Key dates on one line.
  const marks = [
    { label: "Start", iso: project.startDate, icon: "flag" },
    { label: "Approved target", iso: project.targetCompletionDate, icon: "target" },
    ...(revisedTargetCompletion && revisedTargetCompletion !== project.targetCompletionDate
      ? [{ label: "Revised", iso: revisedTargetCompletion, icon: "clock" }]
      : []),
    ...(project.actualCompletionDate ? [{ label: "Actual", iso: project.actualCompletionDate, icon: "checkCircle" }] : []),
  ].filter((m): m is { label: string; iso: string; icon: string } => !!m.iso);
  const times = marks.map((m) => new Date(m.iso).getTime());
  const lo = Math.min(now, ...times);
  const hi = Math.max(now, ...times);
  const pos = (t: number) => (hi === lo ? 50 : ((t - lo) / (hi - lo)) * 100);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Meter label="Time elapsed" value={timePct === null ? null : Math.max(0, timePct)} detail={timeDetail} severity={timeSeverity} />
        <Meter label="Budget spent" value={budgetPct} detail={budgetDetail} severity={budgetSeverity} />
      </div>
      {marks.length > 0 && (
        <div className="pt-1">
          <div className="relative h-14 mx-3">
            <div className="absolute left-0 right-0 top-[22px] h-0.5 rounded bg-slate-200 dark:bg-slate-700" />
            {marks.map((m, i) => (
              <div key={m.label} className="absolute -translate-x-1/2 flex flex-col items-center" style={{ left: `${pos(times[i])}%` }}>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{m.label}</span>
                <span className="w-5 h-5 mt-0.5 rounded-full bg-white dark:bg-slate-900 border-2 border-blue-500 flex items-center justify-center">
                  <Icon name={m.icon} className="w-2.5 h-2.5 text-blue-600 dark:text-blue-300" strokeWidth={2.4} />
                </span>
                <span className="text-[10px] text-slate-600 dark:text-slate-300 whitespace-nowrap tabular-nums mt-0.5">
                  {new Date(m.iso).toLocaleDateString("en-AU", { month: "short", year: "2-digit" })}
                </span>
              </div>
            ))}
            <div className="absolute top-[14px] -translate-x-1/2 flex flex-col items-center" style={{ left: `${pos(now)}%` }}>
              <span className="w-0.5 h-4 bg-red-500 rounded" />
              <span className="text-[10px] font-medium text-red-600 dark:text-red-400 mt-5">Today</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
