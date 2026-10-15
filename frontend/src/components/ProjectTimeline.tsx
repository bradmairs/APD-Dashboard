import { useEffect, useRef, useState } from "react";
import { Milestone, MilestoneInput, Project, Task } from "../types";
import { formatDate } from "../format";
import { useTheme } from "../theme/ThemeContext";
import { SEQUENTIAL_BLUE, TASK_STATUS_COLORS, chartColor } from "../charts/palette";

interface Props {
  project: Project;
  milestones: Milestone[];
  tasks: Task[];
  onUpdateMilestone?: (milestone: Milestone, data: Partial<MilestoneInput>) => Promise<void>;
}

interface DragState {
  milestoneId: string;
  startX: number;
  trackWidth: number;
  initialEndTime: number;
  previewEndTime: number;
}

function toTime(value: string | null | undefined): number | null {
  return value ? new Date(value).getTime() : null;
}

// A milestone's own startDate is optional — most milestones simply run
// back-to-back, so when it's blank a bar's start is inferred as the
// previous milestone's own end, chaining from the project's start date for
// the first one. Setting startDate explicitly overrides that chaining,
// which is how a milestone that starts early, overlaps the previous one, or
// runs concurrently gets placed correctly. Either way, the chain continues
// from this milestone's own end once it has one, so a later milestone with
// no explicit start still picks up where this one left off. A milestone
// with no completion date at all (original/forecast/actual) simply can't be
// placed and is listed without a bar.
function milestoneBars(project: Project, milestones: Milestone[]) {
  let cursor = toTime(project.startDate);
  return milestones.map((milestone) => {
    const endTime =
      toTime(milestone.actualCompletion) ??
      toTime(milestone.forecastedCompletion) ??
      toTime(milestone.originalCompletion);
    const startTime = toTime(milestone.startDate) ?? cursor;
    if (endTime !== null) cursor = endTime;
    return { milestone, startTime, endTime };
  });
}

export default function ProjectTimeline({ project, milestones, tasks, onUpdateMilestone }: Props) {
  const { theme } = useTheme();
  // Re-read the clock once a minute so a page left open all day keeps the
  // "Today" line moving rather than freezing at the moment it loaded.
  const [today, setToday] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setToday(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const bars = milestoneBars(project, milestones);
  const tasksWithDueDate = tasks.filter((t) => t.dueDate);

  const candidateTimes = [
    toTime(project.startDate),
    toTime(project.targetCompletionDate),
    toTime(project.actualCompletionDate),
    ...bars.flatMap((b) => [b.startTime, b.endTime]),
    ...tasksWithDueDate.map((t) => toTime(t.dueDate)),
  ].filter((t): t is number => t !== null);

  const hasData = candidateTimes.length > 0;
  // rawMin/rawMax describe the project's own dates (shown in the header);
  // the drawn domain additionally always contains today, so a project that's
  // running past its last milestone visibly overshoots its bars instead of
  // the "Today" line silently vanishing off the end of the chart.
  const rawMin = hasData ? Math.min(...candidateTimes) : today;
  const rawMax = hasData ? Math.max(...candidateTimes) : today;
  const domainMin = Math.min(rawMin, today);
  const domainMax = Math.max(rawMax, today);
  const span = Math.max(domainMax - domainMin, 24 * 60 * 60 * 1000);
  const pad = span * 0.05;
  const min = domainMin - pad;
  const max = domainMax + pad;

  function percentFor(time: number): number {
    return Math.min(100, Math.max(0, ((time - min) / (max - min)) * 100));
  }

  useEffect(() => {
    if (!drag) return;
    function onMove(e: MouseEvent) {
      const current = dragRef.current;
      if (!current) return;
      const deltaX = e.clientX - current.startX;
      const deltaTime = (deltaX / current.trackWidth) * (max - min);
      const previewEndTime = Math.min(max, Math.max(min, current.initialEndTime + deltaTime));
      const next = { ...current, previewEndTime };
      dragRef.current = next;
      setDrag(next);
    }
    async function onUp() {
      const current = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!current || !onUpdateMilestone) return;
      const milestone = milestones.find((m) => m.id === current.milestoneId);
      if (!milestone) return;
      if (Math.abs(current.previewEndTime - current.initialEndTime) < 60_000) return;
      await onUpdateMilestone(milestone, {
        forecastedCompletion: new Date(current.previewEndTime).toISOString(),
      });
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(drag)]);

  function startDrag(e: React.MouseEvent<HTMLDivElement>, milestone: Milestone, endTime: number) {
    if (!onUpdateMilestone || milestone.actualCompletion) return;
    e.preventDefault();
    const trackEl = e.currentTarget.parentElement as HTMLElement;
    const state: DragState = {
      milestoneId: milestone.id,
      startX: e.clientX,
      trackWidth: trackEl.getBoundingClientRect().width,
      initialEndTime: endTime,
      previewEndTime: endTime,
    };
    dragRef.current = state;
    setDrag(state);
  }

  if (!hasData) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Timeline
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Add a project start date, milestone completion dates, or task due dates to see a timeline.
        </p>
      </div>
    );
  }

  const todayPct = percentFor(today);
  // Keep the label's box on-screen when today sits near either end.
  const labelPct = Math.min(94, Math.max(6, todayPct));
  const todayLabel = `Today · ${formatDate(new Date(today).toISOString())}`;
  const milestoneColor = chartColor(SEQUENTIAL_BLUE, theme);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Timeline</h2>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {formatDate(new Date(rawMin).toISOString())} – {formatDate(new Date(rawMax).toISOString())}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="relative min-w-[640px] space-y-2 pt-6">
          {/* One continuous line across every row (label column is w-40 + gap-3
              = 10.75rem, so the overlay starts where the tracks start). */}
          <div className="pointer-events-none absolute inset-y-0 left-[10.75rem] right-0" aria-hidden="true">
            <div
              className="absolute top-5 bottom-0 w-0.5 -translate-x-1/2 bg-red-500"
              style={{ left: `${todayPct}%` }}
            />
            <div
              className="absolute top-0 -translate-x-1/2 whitespace-nowrap rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white"
              style={{ left: `${labelPct}%` }}
            >
              {todayLabel}
            </div>
          </div>
          {bars.map(({ milestone, startTime, endTime }) => {
            const isDragging = drag?.milestoneId === milestone.id;
            const effectiveEndTime = isDragging ? drag.previewEndTime : endTime;
            const draggable = Boolean(onUpdateMilestone) && !milestone.actualCompletion;
            return (
            <div key={milestone.id} className="flex items-center gap-3">
              <div className="w-40 shrink-0 truncate text-xs text-slate-600 dark:text-slate-300" title={milestone.taskActivity}>
                {milestone.taskActivity}
              </div>
              <div className="relative flex-1 h-4 rounded bg-slate-100 dark:bg-slate-700">
                {startTime !== null && effectiveEndTime !== null ? (
                  <div
                    className={`absolute top-0 bottom-0 rounded overflow-hidden ${
                      draggable ? "cursor-ew-resize" : ""
                    } ${isDragging ? "ring-2 ring-offset-1 ring-blue-500" : ""}`}
                    style={{
                      left: `${percentFor(startTime)}%`,
                      width: `${Math.max(percentFor(effectiveEndTime) - percentFor(startTime), 1.5)}%`,
                      backgroundColor: `${milestoneColor}33`,
                    }}
                    onMouseDown={(e) => endTime !== null && startDrag(e, milestone, endTime)}
                    title={`${milestone.taskActivity}: ${
                      startTime ? formatDate(new Date(startTime).toISOString()) : "no start"
                    } → ${effectiveEndTime ? formatDate(new Date(effectiveEndTime).toISOString()) : "no end"} (${milestone.percentComplete}% complete)${
                      draggable ? " — drag to reschedule" : ""
                    }`}
                  >
                    <div
                      className="h-full"
                      style={{ width: `${milestone.percentComplete}%`, backgroundColor: milestoneColor }}
                    />
                  </div>
                ) : (
                  <span className="absolute inset-y-0 left-2 flex items-center text-[10px] text-slate-400 dark:text-slate-500">
                    No dates set
                  </span>
                )}
              </div>
            </div>
            );
          })}

          {tasksWithDueDate.length > 0 && (
            <div className="flex items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-700">
              <div className="w-40 shrink-0 text-xs text-slate-600 dark:text-slate-300">
                Tasks ({tasksWithDueDate.length})
              </div>
              <div className="relative flex-1 h-4">
                {tasksWithDueDate.map((task) => {
                  const time = toTime(task.dueDate)!;
                  return (
                    <div
                      key={task.id}
                      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45"
                      style={{
                        left: `${percentFor(time)}%`,
                        backgroundColor: chartColor(TASK_STATUS_COLORS[task.status], theme),
                      }}
                      title={`${task.title} — due ${formatDate(task.dueDate)} (${task.status.replace("_", " ")})`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
