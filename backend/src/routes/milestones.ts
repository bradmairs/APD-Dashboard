import { Request, Response, Router } from "express";
import { prisma } from "../prisma";
import { describeMilestoneUpdate, logActivity } from "../activityLog";

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value as string) : null;
}

function parsePercent(value: unknown): number | null {
  const pct = Number(value);
  if (Number.isNaN(pct) || pct < 0 || pct > 100) return null;
  return pct;
}

const projectMilestonesRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectMilestonesRouter.get(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const milestones = await prisma.milestone.findMany({
      where: { projectId: req.params.id },
      orderBy: { sortOrder: "asc" },
    });
    res.json(milestones);
  }
);

projectMilestonesRouter.post(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const {
      wbsItem,
      taskActivity,
      percentComplete,
      startDate,
      originalCompletion,
      forecastedCompletion,
      actualCompletion,
      notes,
    } = req.body as Record<string, unknown>;

    if (typeof taskActivity !== "string" || !taskActivity.trim()) {
      return res.status(400).json({ error: "Task/Activity is required" });
    }

    let pct = 0;
    if (percentComplete !== undefined) {
      const parsed = parsePercent(percentComplete);
      if (parsed === null) {
        return res
          .status(400)
          .json({ error: "Percentage completed must be between 0 and 100" });
      }
      pct = parsed;
    }

    const count = await prisma.milestone.count({ where: { projectId: req.params.id } });

    try {
      const milestone = await prisma.milestone.create({
        data: {
          projectId: req.params.id,
          wbsItem: (wbsItem as string) || null,
          taskActivity: taskActivity.trim(),
          percentComplete: pct,
          startDate: parseDate(startDate) ?? null,
          originalCompletion: parseDate(originalCompletion) ?? null,
          forecastedCompletion: parseDate(forecastedCompletion) ?? null,
          actualCompletion: parseDate(actualCompletion) ?? null,
          notes: (notes as string) || null,
          sortOrder: count,
        },
      });
      await logActivity({
        projectId: project.id,
        projectName: project.name,
        userId: req.user!.sub,
        userName: req.user!.name,
        action: `added milestone "${milestone.taskActivity}"`,
      });
      res.status(201).json(milestone);
    } catch (err) {
      res.status(400).json({ error: "Unable to create milestone" });
    }
  }
);

export const milestonesRouter = Router();

milestonesRouter.put("/:id", async (req, res) => {
  const before = await prisma.milestone.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Milestone not found" });

  const {
    wbsItem,
    taskActivity,
    percentComplete,
    startDate,
    originalCompletion,
    forecastedCompletion,
    actualCompletion,
    notes,
  } = req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (taskActivity !== undefined) {
    if (typeof taskActivity !== "string" || !taskActivity.trim()) {
      return res.status(400).json({ error: "Task/Activity is required" });
    }
    data.taskActivity = taskActivity.trim();
  }
  if (wbsItem !== undefined) data.wbsItem = wbsItem || null;
  if (percentComplete !== undefined) {
    const pct = parsePercent(percentComplete);
    if (pct === null) {
      return res
        .status(400)
        .json({ error: "Percentage completed must be between 0 and 100" });
    }
    data.percentComplete = pct;
  }
  const start = parseDate(startDate);
  if (start !== undefined) data.startDate = start;
  const original = parseDate(originalCompletion);
  if (original !== undefined) data.originalCompletion = original;
  const forecasted = parseDate(forecastedCompletion);
  if (forecasted !== undefined) data.forecastedCompletion = forecasted;
  const actual = parseDate(actualCompletion);
  if (actual !== undefined) data.actualCompletion = actual;
  if (notes !== undefined) data.notes = notes || null;

  try {
    const milestone = await prisma.milestone.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeMilestoneUpdate(before, data),
    });
    res.json(milestone);
  } catch (err) {
    res.status(400).json({ error: "Unable to update milestone" });
  }
});

milestonesRouter.delete("/:id", async (req, res) => {
  const milestone = await prisma.milestone.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!milestone) return res.status(404).json({ error: "Milestone not found" });

  await logActivity({
    projectId: milestone.project.id,
    projectName: milestone.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted milestone "${milestone.taskActivity}"`,
  });
  await prisma.milestone.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// Swaps sortOrder with the adjacent milestone rather than accepting an
// arbitrary reordering — the UI only ever offers "move up"/"move down", and
// a swap is race-safe without needing to send the whole list's order back.
milestonesRouter.post("/:id/reorder", async (req, res) => {
  const { direction } = req.body as { direction?: "up" | "down" };
  if (direction !== "up" && direction !== "down") {
    return res.status(400).json({ error: "direction must be 'up' or 'down'" });
  }

  const milestone = await prisma.milestone.findUnique({ where: { id: req.params.id } });
  if (!milestone) return res.status(404).json({ error: "Milestone not found" });

  const neighbor = await prisma.milestone.findFirst({
    where: {
      projectId: milestone.projectId,
      sortOrder:
        direction === "up"
          ? { lt: milestone.sortOrder }
          : { gt: milestone.sortOrder },
    },
    orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
  });

  if (neighbor) {
    await prisma.$transaction([
      prisma.milestone.update({
        where: { id: milestone.id },
        data: { sortOrder: neighbor.sortOrder },
      }),
      prisma.milestone.update({
        where: { id: neighbor.id },
        data: { sortOrder: milestone.sortOrder },
      }),
    ]);
  }

  const milestones = await prisma.milestone.findMany({
    where: { projectId: milestone.projectId },
    orderBy: { sortOrder: "asc" },
  });
  res.json(milestones);
});

export default projectMilestonesRouter;
