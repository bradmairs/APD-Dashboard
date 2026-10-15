import { Request, Response, Router } from "express";
import { LessonType } from "@prisma/client";
import { prisma } from "../prisma";
import { describeLessonLearnedUpdate, logActivity } from "../activityLog";

const LESSON_TYPES = ["POSITIVE", "NEGATIVE"];

const projectLessonsLearnedRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectLessonsLearnedRouter.get(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const lessons = await prisma.lessonLearned.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(lessons);
  }
);

projectLessonsLearnedRouter.post(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const { type, title, category, description, recommendation } = req.body as Record<
      string,
      unknown
    >;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (type !== undefined && !LESSON_TYPES.includes(type as string)) {
      return res.status(400).json({ error: "type must be POSITIVE or NEGATIVE" });
    }

    const lesson = await prisma.lessonLearned.create({
      data: {
        projectId: req.params.id,
        type: (type as LessonType) ?? "POSITIVE",
        title: title.trim(),
        category: (category as string) || null,
        description: (description as string) || null,
        recommendation: (recommendation as string) || null,
        createdById: req.user!.sub,
        createdByName: req.user!.name,
      },
    });

    await logActivity({
      projectId: project.id,
      projectName: project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: `logged a lesson learned "${lesson.title}"`,
    });

    res.status(201).json(lesson);
  }
);

export const lessonsLearnedRouter = Router();

// Every lesson across every project, for the portfolio-wide Lessons
// Learned browse page — avoids one request per project.
lessonsLearnedRouter.get("/", async (_req, res) => {
  const lessons = await prisma.lessonLearned.findMany({
    orderBy: { createdAt: "desc" },
    include: { project: { select: { id: true, name: true, assetType: true } } },
  });
  res.json(lessons);
});

lessonsLearnedRouter.put("/:id", async (req, res) => {
  const before = await prisma.lessonLearned.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Lesson not found" });

  const { type, title, category, description, recommendation } = req.body as Record<
    string,
    unknown
  >;

  const data: Record<string, unknown> = {};

  if (type !== undefined) {
    if (!LESSON_TYPES.includes(type as string)) {
      return res.status(400).json({ error: "type must be POSITIVE or NEGATIVE" });
    }
    data.type = type;
  }
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    data.title = title.trim();
  }
  if (category !== undefined) data.category = category || null;
  if (description !== undefined) data.description = description || null;
  if (recommendation !== undefined) data.recommendation = recommendation || null;

  try {
    const lesson = await prisma.lessonLearned.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeLessonLearnedUpdate(before, data),
    });
    res.json(lesson);
  } catch (err) {
    res.status(400).json({ error: "Unable to update lesson" });
  }
});

lessonsLearnedRouter.delete("/:id", async (req, res) => {
  const lesson = await prisma.lessonLearned.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });

  await logActivity({
    projectId: lesson.project.id,
    projectName: lesson.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted lesson learned "${lesson.title}"`,
  });
  await prisma.lessonLearned.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectLessonsLearnedRouter;
