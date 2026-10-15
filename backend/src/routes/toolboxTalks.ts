import { Request, Response, Router } from "express";
import { prisma } from "../prisma";
import { describeToolboxTalkUpdate, logActivity } from "../activityLog";

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value as string) : null;
}

function parseRequiredDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const projectToolboxTalksRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectToolboxTalksRouter.get("/", async (req: Request<ProjectParams>, res: Response) => {
  const talks = await prisma.toolboxTalk.findMany({
    where: { projectId: req.params.id },
    orderBy: { talkDate: "desc" },
  });
  res.json(talks);
});

projectToolboxTalksRouter.post("/", async (req: Request<ProjectParams>, res: Response) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const { talkDate, topic, conductedBy, attendees, keyPoints, notes } =
    req.body as Record<string, unknown>;

  const parsedTalkDate = parseRequiredDate(talkDate);
  if (!parsedTalkDate) {
    return res.status(400).json({ error: "A valid talk date is required" });
  }
  if (typeof topic !== "string" || !topic.trim()) {
    return res.status(400).json({ error: "Topic is required" });
  }
  if (typeof conductedBy !== "string" || !conductedBy.trim()) {
    return res.status(400).json({ error: "Conducted by is required" });
  }

  const talk = await prisma.toolboxTalk.create({
    data: {
      projectId: req.params.id,
      talkDate: parsedTalkDate,
      topic: topic.trim(),
      conductedBy: conductedBy.trim(),
      attendees: (attendees as string) || null,
      keyPoints: (keyPoints as string) || null,
      notes: (notes as string) || null,
      recordedById: req.user!.sub,
      recordedByName: req.user!.name,
    },
  });

  await logActivity({
    projectId: project.id,
    projectName: project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `recorded a toolbox talk on "${talk.topic}"`,
  });

  res.status(201).json(talk);
});

export const toolboxTalksRouter = Router();

toolboxTalksRouter.put("/:id", async (req, res) => {
  const before = await prisma.toolboxTalk.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Toolbox talk not found" });

  const { talkDate, topic, conductedBy, attendees, keyPoints, notes } =
    req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  const date = parseDate(talkDate);
  if (date !== undefined) data.talkDate = date ?? before.talkDate;
  if (topic !== undefined) {
    if (typeof topic !== "string" || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required" });
    }
    data.topic = topic.trim();
  }
  if (conductedBy !== undefined) {
    if (typeof conductedBy !== "string" || !conductedBy.trim()) {
      return res.status(400).json({ error: "Conducted by is required" });
    }
    data.conductedBy = conductedBy.trim();
  }
  if (attendees !== undefined) data.attendees = attendees || null;
  if (keyPoints !== undefined) data.keyPoints = keyPoints || null;
  if (notes !== undefined) data.notes = notes || null;

  try {
    const talk = await prisma.toolboxTalk.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeToolboxTalkUpdate(before),
    });
    res.json(talk);
  } catch (err) {
    res.status(400).json({ error: "Unable to update toolbox talk" });
  }
});

toolboxTalksRouter.delete("/:id", async (req, res) => {
  const talk = await prisma.toolboxTalk.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!talk) return res.status(404).json({ error: "Toolbox talk not found" });

  await logActivity({
    projectId: talk.project.id,
    projectName: talk.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted the toolbox talk on "${talk.topic}"`,
  });
  await prisma.toolboxTalk.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectToolboxTalksRouter;
