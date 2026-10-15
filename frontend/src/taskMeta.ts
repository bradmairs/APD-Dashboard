import { Task, TaskRecurrence } from "./types";

export const ALL_TASK_RECURRENCES: TaskRecurrence[] = ["NONE", "DAILY", "WEEKLY", "MONTHLY"];

export const TASK_RECURRENCE_LABELS: Record<TaskRecurrence, string> = {
  NONE: "Does not repeat",
  DAILY: "Repeats daily",
  WEEKLY: "Repeats weekly",
  MONTHLY: "Repeats monthly",
};

export function isTaskOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === "DONE") return false;
  return new Date(task.dueDate) < new Date();
}

export function isTaskDueSoon(task: Task, withinDays = 7): boolean {
  if (!task.dueDate || task.status === "DONE" || isTaskOverdue(task)) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);
  return new Date(task.dueDate) <= cutoff;
}
