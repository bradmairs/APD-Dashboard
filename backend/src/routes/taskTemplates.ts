import { Router } from "express";
import { prisma } from "../prisma";
import { logActivity } from "../activityLog";

const router = Router();

interface ItemInput {
  title?: unknown;
  description?: unknown;
  dueOffsetDays?: unknown;
}

function parseItems(raw: unknown): { title: string; description: string | null; dueOffsetDays: number | null }[] {
  if (!Array.isArray(raw)) return [];
  return (raw as ItemInput[])
    .filter((item) => typeof item.title === "string" && item.title.trim())
    .map((item) => ({
      title: (item.title as string).trim(),
      description: typeof item.description === "string" && item.description ? item.description : null,
      dueOffsetDays:
        item.dueOffsetDays === null || item.dueOffsetDays === undefined || item.dueOffsetDays === ""
          ? null
          : Number(item.dueOffsetDays),
    }));
}

router.get("/", async (_req, res) => {
  const templates = await prisma.taskTemplate.findMany({
    orderBy: { name: "asc" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  res.json(templates);
});

router.post("/", async (req, res) => {
  const { name, description, items } = req.body as {
    name?: string;
    description?: string;
    items?: unknown;
  };
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Name is required" });
  }
  const parsedItems = parseItems(items);
  if (parsedItems.length === 0) {
    return res.status(400).json({ error: "At least one task item is required" });
  }

  const template = await prisma.taskTemplate.create({
    data: {
      name: name.trim(),
      description: description || null,
      createdById: req.user!.sub,
      items: {
        create: parsedItems.map((item, index) => ({ ...item, sortOrder: index })),
      },
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  res.status(201).json(template);
});

router.put("/:id", async (req, res) => {
  const { name, description, items } = req.body as {
    name?: string;
    description?: string;
    items?: unknown;
  };
  const existing = await prisma.taskTemplate.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Template not found" });

  const data: Record<string, unknown> = {};
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    data.name = name.trim();
  }
  if (description !== undefined) data.description = description || null;

  // Items are replaced wholesale rather than diffed — a template's item
  // list is small and edited as a batch in the form UI, the same rationale
  // CashFlowEntry's upsert-list endpoint uses for a month's whole set of
  // entries rather than per-item PATCH endpoints.
  if (items !== undefined) {
    const parsedItems = parseItems(items);
    if (parsedItems.length === 0) {
      return res.status(400).json({ error: "At least one task item is required" });
    }
    await prisma.taskTemplateItem.deleteMany({ where: { templateId: req.params.id } });
    data.items = { create: parsedItems.map((item, index) => ({ ...item, sortOrder: index })) };
  }

  const template = await prisma.taskTemplate.update({
    where: { id: req.params.id },
    data,
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  res.json(template);
});

router.delete("/:id", async (req, res) => {
  const existing = await prisma.taskTemplate.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Template not found" });
  await prisma.taskTemplate.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// Creates one Task per template item on the given project. dueOffsetDays is
// resolved against the project's own startDate at apply time (see the
// schema comment on TaskTemplateItem) — an item with no offset, or a
// project with no startDate, simply gets no due date.
router.post("/:id/apply", async (req, res) => {
  const { projectId } = req.body as { projectId?: string };
  if (!projectId) return res.status(400).json({ error: "projectId is required" });

  const [template, project] = await Promise.all([
    prisma.taskTemplate.findUnique({
      where: { id: req.params.id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.project.findUnique({ where: { id: projectId } }),
  ]);
  if (!template) return res.status(404).json({ error: "Template not found" });
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (template.items.length === 0) {
    return res.status(400).json({ error: "This template has no task items" });
  }

  const startTime = project.startDate ? new Date(project.startDate).getTime() : null;
  const tasks = await prisma.$transaction(
    template.items.map((item) =>
      prisma.task.create({
        data: {
          projectId,
          title: item.title,
          description: item.description,
          dueDate:
            item.dueOffsetDays !== null && startTime !== null
              ? new Date(startTime + item.dueOffsetDays * 24 * 60 * 60 * 1000)
              : null,
        },
      })
    )
  );

  await logActivity({
    projectId: project.id,
    projectName: project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `applied task template "${template.name}" (${tasks.length} task${tasks.length === 1 ? "" : "s"})`,
  });

  res.status(201).json(tasks);
});

export default router;
