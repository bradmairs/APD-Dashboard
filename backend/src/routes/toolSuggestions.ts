import { Router } from "express";
import { ToolSuggestionCategory, ToolSuggestionStatus } from "@prisma/client";
import { prisma } from "../prisma";

// The dashboard's own suggestion box — ideas for new features and
// improvements to the tool itself, not to any project. Everyone signed in can
// read and add suggestions (Viewers included: asking for a change isn't
// editing project data). A suggestion's author or an admin can edit or
// delete it; only an admin can set its status and response.
const router = Router();

const CATEGORIES: ToolSuggestionCategory[] = ["NEW_FEATURE", "IMPROVEMENT", "BUG", "OTHER"];
const STATUSES: ToolSuggestionStatus[] = ["OPEN", "PLANNED", "IN_PROGRESS", "DONE", "DECLINED"];

const MAX_TITLE_LENGTH = 200;
const MAX_TEXT_LENGTH = 5000;

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_TEXT_LENGTH) : null;
}

router.get("/", async (_req, res) => {
  const suggestions = await prisma.toolSuggestion.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(suggestions);
});

router.post("/", async (req, res) => {
  const { title, description, category } = req.body as Record<string, unknown>;
  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }
  if (category !== undefined && !CATEGORIES.includes(category as ToolSuggestionCategory)) {
    return res.status(400).json({ error: "Invalid category" });
  }

  const suggestion = await prisma.toolSuggestion.create({
    data: {
      title: title.trim().slice(0, MAX_TITLE_LENGTH),
      description: optionalText(description),
      category: (category as ToolSuggestionCategory | undefined) ?? "IMPROVEMENT",
      createdById: req.user!.sub,
      createdByName: req.user!.name,
    },
  });
  res.status(201).json(suggestion);
});

router.put("/:id", async (req, res) => {
  const before = await prisma.toolSuggestion.findUnique({ where: { id: req.params.id } });
  if (!before) return res.status(404).json({ error: "Suggestion not found" });

  const isAdmin = req.user!.role === "ADMIN";
  const isAuthor = !!before.createdById && before.createdById === req.user!.sub;
  const { title, description, category, status, response } = req.body as Record<
    string,
    unknown
  >;

  const data: Record<string, unknown> = {};

  if (title !== undefined || description !== undefined || category !== undefined) {
    if (!isAdmin && !isAuthor) {
      return res
        .status(403)
        .json({ error: "Only the person who made this suggestion or an admin can edit it" });
    }
    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ error: "Title is required" });
      }
      data.title = title.trim().slice(0, MAX_TITLE_LENGTH);
    }
    if (description !== undefined) data.description = optionalText(description);
    if (category !== undefined) {
      if (!CATEGORIES.includes(category as ToolSuggestionCategory)) {
        return res.status(400).json({ error: "Invalid category" });
      }
      data.category = category;
    }
  }

  if (status !== undefined || response !== undefined) {
    if (!isAdmin) {
      return res.status(403).json({ error: "Only an admin can change a suggestion's status" });
    }
    if (status !== undefined) {
      if (!STATUSES.includes(status as ToolSuggestionStatus)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      data.status = status;
    }
    if (response !== undefined) data.response = optionalText(response);
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  const suggestion = await prisma.toolSuggestion.update({
    where: { id: req.params.id },
    data,
  });
  res.json(suggestion);
});

router.delete("/:id", async (req, res) => {
  const suggestion = await prisma.toolSuggestion.findUnique({ where: { id: req.params.id } });
  if (!suggestion) return res.status(404).json({ error: "Suggestion not found" });
  const isAuthor = !!suggestion.createdById && suggestion.createdById === req.user!.sub;
  if (!isAuthor && req.user!.role !== "ADMIN") {
    return res
      .status(403)
      .json({ error: "Only the person who made this suggestion or an admin can delete it" });
  }
  await prisma.toolSuggestion.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
