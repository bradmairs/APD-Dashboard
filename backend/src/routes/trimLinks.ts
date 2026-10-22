import { Router } from "express";
import { prisma } from "../prisma";

// Shared TRIM (records management) links for the main dashboard — common
// folders, templates and procedures. Any member or admin can add one; its
// creator or an admin can edit or delete it. Mounted behind
// blockViewerMutations, so Viewers can read but not change them.
const router = Router();

const MAX_TEXT_LENGTH = 2000;

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_TEXT_LENGTH) : null;
}

router.get("/", async (_req, res) => {
  const links = await prisma.trimLink.findMany({
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });
  res.json(links);
});

router.post("/", async (req, res) => {
  const title = text(req.body?.title);
  const location = text(req.body?.location);
  if (!title) return res.status(400).json({ error: "Title is required" });
  if (!location) {
    return res.status(400).json({ error: "A link or TRIM record number is required" });
  }
  const link = await prisma.trimLink.create({
    data: {
      title,
      location,
      category: text(req.body?.category),
      description: text(req.body?.description),
      createdById: req.user!.sub,
      createdByName: req.user!.name,
    },
  });
  res.status(201).json(link);
});

router.put("/:id", async (req, res) => {
  const before = await prisma.trimLink.findUnique({ where: { id: req.params.id } });
  if (!before) return res.status(404).json({ error: "Link not found" });
  if (before.createdById && before.createdById !== req.user!.sub && req.user!.role !== "ADMIN") {
    return res.status(403).json({ error: "Only the person who added this link or an admin can edit it" });
  }
  const { title, location, category, description } = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (title !== undefined) {
    data.title = text(title);
    if (!data.title) return res.status(400).json({ error: "Title is required" });
  }
  if (location !== undefined) {
    data.location = text(location);
    if (!data.location) {
      return res.status(400).json({ error: "A link or TRIM record number is required" });
    }
  }
  if (category !== undefined) data.category = text(category);
  if (description !== undefined) data.description = text(description);
  const link = await prisma.trimLink.update({ where: { id: req.params.id }, data });
  res.json(link);
});

router.delete("/:id", async (req, res) => {
  const link = await prisma.trimLink.findUnique({ where: { id: req.params.id } });
  if (!link) return res.status(404).json({ error: "Link not found" });
  if (link.createdById && link.createdById !== req.user!.sub && req.user!.role !== "ADMIN") {
    return res.status(403).json({ error: "Only the person who added this link or an admin can delete it" });
  }
  await prisma.trimLink.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
