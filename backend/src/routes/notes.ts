import { Router } from "express";
import { prisma } from "../prisma";
import { logActivity } from "../activityLog";

// Ideas & notes on a project (3.1). Anyone but a Viewer can add and edit
// notes (the readOnlyGuarded mount blocks Viewers from changes).
const router = Router();

const COLORS = new Set(["yellow", "blue", "green", "pink", "purple", "orange", "slate"]);

function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim().replace(/^#/, "").toLowerCase().replace(/\s+/g, "-"))
        .filter(Boolean)
        .map((t) => t.slice(0, 40))
    )
  ).slice(0, 20);
}

function noteData(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = String(body.title ?? "").trim().slice(0, 200);
  if (body.body !== undefined) data.body = String(body.body ?? "").slice(0, 50_000);
  if (body.tags !== undefined) data.tags = cleanTags(body.tags);
  if (body.color !== undefined) data.color = typeof body.color === "string" && COLORS.has(body.color) ? body.color : null;
  if (body.pinned !== undefined) data.pinned = body.pinned === true;
  return data;
}

// GET /api/notes?projectId=
router.get("/", async (req, res) => {
  const projectId = req.query.projectId;
  if (typeof projectId !== "string") return res.status(400).json({ error: "projectId is required" });
  const notes = await prisma.projectNote.findMany({
    where: { projectId },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });
  res.json(notes);
});

// POST /api/notes { projectId, title, body, tags, color, pinned }
// or { projectId, notes: [...] } to import several at once.
router.post("/", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const projectId = body.projectId;
  if (typeof projectId !== "string") return res.status(400).json({ error: "projectId is required" });
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, name: true } });
  if (!project) return res.status(404).json({ error: "Project not found" });
  const list = Array.isArray(body.notes) ? (body.notes as Record<string, unknown>[]).slice(0, 500) : [body];
  const created = [];
  for (const item of list) {
    const data = noteData(item ?? {});
    if (!data.title) {
      if (list.length === 1) return res.status(400).json({ error: "Give the note a title" });
      continue;
    }
    created.push(
      await prisma.projectNote.create({
        data: {
          title: data.title as string,
          body: (data.body as string) ?? "",
          tags: (data.tags as string[]) ?? [],
          color: (data.color as string | null) ?? null,
          pinned: (data.pinned as boolean) ?? false,
          projectId,
          createdById: req.user!.sub,
          createdByName: req.user!.name,
        },
      })
    );
  }
  await logActivity({
    projectId,
    projectName: project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: created.length === 1 ? `added the note "${created[0].title}"` : `imported ${created.length} notes`,
  });
  res.status(201).json(Array.isArray(body.notes) ? created : created[0]);
});

router.put("/:id", async (req, res) => {
  const existing = await prisma.projectNote.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Note not found" });
  const data = noteData(req.body as Record<string, unknown>);
  if (data.title === "") return res.status(400).json({ error: "Give the note a title" });
  const note = await prisma.projectNote.update({
    where: { id: existing.id },
    data: { ...data, updatedByName: req.user!.name },
  });
  res.json(note);
});

router.delete("/:id", async (req, res) => {
  const existing = await prisma.projectNote.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { name: true } } },
  });
  if (!existing) return res.status(404).json({ error: "Note not found" });
  await prisma.projectNote.delete({ where: { id: existing.id } });
  await logActivity({
    projectId: existing.projectId,
    projectName: existing.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted the note "${existing.title}"`,
  });
  res.status(204).send();
});

export default router;
