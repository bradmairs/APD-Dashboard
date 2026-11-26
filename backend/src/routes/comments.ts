import { Router } from "express";
import { prisma } from "../prisma";

// Comments on a record (3.0), with @mentions. A mention is stored as the
// mentioned user's id so the notification reaches the right person even if
// two people share a first name; the body keeps the "@Name" text as typed.

const router = Router();

// GET /api/comments?entityType=&entityId=
router.get("/", async (req, res) => {
  const { entityType, entityId } = req.query as Record<string, string | undefined>;
  if (!entityType || !entityId) return res.status(400).json({ error: "entityType and entityId are required" });
  const rows = await prisma.comment.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "asc" },
  });
  res.json(rows);
});

// GET /api/comments/counts?entityType=&ids=a,b,c — comment count per record.
router.get("/counts", async (req, res) => {
  const { entityType, ids } = req.query as Record<string, string | undefined>;
  if (!entityType || !ids) return res.json({});
  const list = ids.split(",").filter(Boolean).slice(0, 500);
  const groups = await prisma.comment.groupBy({
    by: ["entityId"],
    where: { entityType, entityId: { in: list } },
    _count: { _all: true },
  });
  res.json(Object.fromEntries(groups.map((g) => [g.entityId, g._count._all])));
});

// GET /api/comments/mentions — comments that mention me, newest first.
router.get("/mentions", async (req, res) => {
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const rows = await prisma.comment.findMany({
    where: { mentionIds: { has: req.user!.sub }, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { project: { select: { id: true, name: true } } },
  });
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { projectId, entityType, entityId, entityLabel, body, mentionIds } = req.body as Record<string, unknown>;
  if (typeof projectId !== "string" || typeof entityType !== "string" || typeof entityId !== "string") {
    return res.status(400).json({ error: "projectId, entityType and entityId are required" });
  }
  if (typeof body !== "string" || !body.trim()) return res.status(400).json({ error: "Write a comment" });
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) return res.status(404).json({ error: "Project not found" });
  const ids = Array.isArray(mentionIds) ? mentionIds.filter((m): m is string => typeof m === "string").slice(0, 20) : [];
  const valid = ids.length
    ? (await prisma.user.findMany({ where: { id: { in: ids }, active: true }, select: { id: true } })).map((u) => u.id)
    : [];
  const comment = await prisma.comment.create({
    data: {
      projectId,
      entityType: entityType.slice(0, 40),
      entityId,
      entityLabel: typeof entityLabel === "string" ? entityLabel.slice(0, 200) : "",
      body: body.trim().slice(0, 5000),
      authorId: req.user!.sub,
      authorName: req.user!.name,
      mentionIds: valid.filter((id) => id !== req.user!.sub),
    },
  });
  res.status(201).json(comment);
});

router.delete("/:id", async (req, res) => {
  const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
  if (!comment) return res.status(404).json({ error: "Comment not found" });
  if (comment.authorId !== req.user!.sub && req.user!.role !== "ADMIN") {
    return res.status(403).json({ error: "Only the author (or an admin) can delete a comment" });
  }
  await prisma.comment.delete({ where: { id: comment.id } });
  res.status(204).send();
});

export default router;
