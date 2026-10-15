import { Request, Response, Router } from "express";
import { Task, TaskRecurrence } from "@prisma/client";
import { prisma } from "../prisma";
import { describeTaskUpdate, logActivity } from "../activityLog";

const projectTasksRouter = Router({ mergeParams: true });

type ProjectParams = { projectId: string };

projectTasksRouter.get(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const tasks = await prisma.task.findMany({
      where: { projectId: req.params.projectId },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    });
    res.json(tasks);
  }
);

projectTasksRouter.post(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    try {
      const task = await prisma.task.create({
        data: { ...req.body, projectId: req.params.projectId },
        include: { project: { select: { id: true, name: true } } },
      });
      await logActivity({
        projectId: task.project!.id,
        projectName: task.project!.name,
        userId: req.user!.sub,
        userName: req.user!.name,
        action: `added task "${task.title}"`,
      });
      res.status(201).json(task);
    } catch (err) {
      res.status(400).json({ error: "Invalid task data" });
    }
  }
);

export const tasksRouter = Router();

// Portfolio-wide tasks: relevant to every project rather than any one of
// them (e.g. "Complete monthly reports"), so they have no projectId at all
// rather than being attached to an arbitrary project.
tasksRouter.get("/portfolio", async (_req, res) => {
  const tasks = await prisma.task.findMany({
    where: { projectId: null },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });
  res.json(tasks);
});

tasksRouter.post("/portfolio", async (req, res) => {
  try {
    const task = await prisma.task.create({
      data: { ...req.body, projectId: null },
    });
    await logActivity({
      projectId: null,
      projectName: "Portfolio",
      userId: req.user!.sub,
      userName: req.user!.name,
      action: `added portfolio task "${task.title}"`,
    });
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: "Invalid task data" });
  }
});

tasksRouter.get("/upcoming", async (_req, res) => {
  const tasks = await prisma.task.findMany({
    where: { status: { not: "DONE" }, dueDate: { not: null } },
    orderBy: { dueDate: "asc" },
    take: 50,
    include: { project: { select: { id: true, name: true } } },
  });
  res.json(tasks);
});

// Advances a due date by one recurrence interval, from the task's current
// due date if it has one or from now otherwise. Month-end due dates (e.g.
// the 31st) roll over correctly since JS Date normalizes an out-of-range
// day-of-month by carrying into the following month.
function nextDueDate(from: Date | null, recurrence: TaskRecurrence): Date {
  const next = from ? new Date(from) : new Date();
  switch (recurrence) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
  }
  return next;
}

async function createNextOccurrence(
  before: Task,
  projectName: string,
  userId: string,
  userName: string
) {
  const next = await prisma.task.create({
    data: {
      projectId: before.projectId,
      title: before.title,
      description: before.description,
      recurrence: before.recurrence,
      dueDate: nextDueDate(before.dueDate, before.recurrence),
    },
  });
  await logActivity({
    projectId: before.projectId,
    projectName,
    userId,
    userName,
    action: `created the next occurrence of recurring task "${before.title}"`,
  });
  return next;
}

tasksRouter.put("/:id", async (req, res) => {
  const before = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Task not found" });

  const projectId = before.project?.id ?? null;
  const projectName = before.project?.name ?? "Portfolio";

  try {
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: req.body,
    });
    await logActivity({
      projectId,
      projectName,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeTaskUpdate(before, req.body),
    });

    if (
      req.body.status === "DONE" &&
      before.status !== "DONE" &&
      before.recurrence !== "NONE"
    ) {
      await createNextOccurrence(before, projectName, req.user!.sub, req.user!.name);
    }

    res.json(task);
  } catch (err) {
    res.status(400).json({ error: "Unable to update task" });
  }
});

tasksRouter.delete("/:id", async (req, res) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!task) return res.status(404).json({ error: "Task not found" });

  await logActivity({
    projectId: task.project?.id ?? null,
    projectName: task.project?.name ?? "Portfolio",
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted task "${task.title}"`,
  });
  await prisma.task.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectTasksRouter;
