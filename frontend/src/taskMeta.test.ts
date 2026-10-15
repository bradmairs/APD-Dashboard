import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isTaskDueSoon, isTaskOverdue } from "./taskMeta";
import type { Task } from "./types";

const task = (dueDate: string | null, status = "TODO") => ({ dueDate, status }) as unknown as Task;

describe("task due-date helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("flags past-due open tasks as overdue", () => {
    expect(isTaskOverdue(task("2026-06-10T00:00:00Z"))).toBe(true);
  });

  it("never flags done tasks or tasks without a due date", () => {
    expect(isTaskOverdue(task("2026-06-10T00:00:00Z", "DONE"))).toBe(false);
    expect(isTaskOverdue(task(null))).toBe(false);
  });

  it("flags tasks due within a week as due soon, but not overdue or distant ones", () => {
    expect(isTaskDueSoon(task("2026-06-18T00:00:00Z"))).toBe(true);
    expect(isTaskDueSoon(task("2026-06-10T00:00:00Z"))).toBe(false);
    expect(isTaskDueSoon(task("2026-07-30T00:00:00Z"))).toBe(false);
  });
});
