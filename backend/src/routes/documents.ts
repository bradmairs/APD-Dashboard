import { Request, Response, Router } from "express";
import { DocumentStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { describeDocumentUpdate, logActivity } from "../activityLog";

const STATUSES = ["DRAFT", "FOR_REVIEW", "APPROVED", "SUPERSEDED"];

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value as string) : null;
}

const projectDocumentsRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectDocumentsRouter.get("/", async (req: Request<ProjectParams>, res: Response) => {
  const documents = await prisma.documentRecord.findMany({
    where: { projectId: req.params.id },
    orderBy: { documentNumber: "asc" },
  });
  res.json(documents);
});

projectDocumentsRouter.post("/", async (req: Request<ProjectParams>, res: Response) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const { documentNumber, title, category, revision, status, issueDate, description, notes } =
    req.body as Record<string, unknown>;

  if (typeof documentNumber !== "string" || !documentNumber.trim()) {
    return res.status(400).json({ error: "Document number is required" });
  }
  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }
  if (typeof revision !== "string" || !revision.trim()) {
    return res.status(400).json({ error: "Revision is required" });
  }
  if (status !== undefined && !STATUSES.includes(status as string)) {
    return res.status(400).json({ error: "status must be DRAFT, FOR_REVIEW, APPROVED or SUPERSEDED" });
  }

  const document = await prisma.documentRecord.create({
    data: {
      projectId: req.params.id,
      documentNumber: documentNumber.trim(),
      title: title.trim(),
      category: (category as string) || null,
      revision: revision.trim(),
      status: (status as DocumentStatus) ?? "DRAFT",
      issueDate: parseDate(issueDate) ?? null,
      description: (description as string) || null,
      uploadedById: req.user!.sub,
      uploadedByName: req.user!.name,
      notes: (notes as string) || null,
    },
  });

  await logActivity({
    projectId: project.id,
    projectName: project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `added document "${document.documentNumber}: ${document.title}"`,
  });

  res.status(201).json(document);
});

export const documentsRouter = Router();

// Every document across every project, for a possible portfolio-wide view —
// avoids one request per project.
documentsRouter.get("/", async (_req, res) => {
  const documents = await prisma.documentRecord.findMany({
    orderBy: { documentNumber: "asc" },
    include: { project: { select: { id: true, name: true } } },
  });
  res.json(documents);
});

documentsRouter.put("/:id", async (req, res) => {
  const before = await prisma.documentRecord.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Document not found" });

  const { documentNumber, title, category, revision, status, issueDate, description, notes } =
    req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (documentNumber !== undefined) {
    if (typeof documentNumber !== "string" || !documentNumber.trim()) {
      return res.status(400).json({ error: "Document number is required" });
    }
    data.documentNumber = documentNumber.trim();
  }
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    data.title = title.trim();
  }
  if (revision !== undefined) {
    if (typeof revision !== "string" || !revision.trim()) {
      return res.status(400).json({ error: "Revision is required" });
    }
    data.revision = revision.trim();
  }
  if (category !== undefined) data.category = category || null;
  const issued = parseDate(issueDate);
  if (issued !== undefined) data.issueDate = issued;
  if (description !== undefined) data.description = description || null;
  if (notes !== undefined) data.notes = notes || null;
  if (status !== undefined) {
    if (!STATUSES.includes(status as string)) {
      return res.status(400).json({ error: "status must be DRAFT, FOR_REVIEW, APPROVED or SUPERSEDED" });
    }
    data.status = status;
  }

  try {
    const document = await prisma.documentRecord.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeDocumentUpdate(before, data),
    });
    res.json(document);
  } catch (err) {
    res.status(400).json({ error: "Unable to update document" });
  }
});

documentsRouter.delete("/:id", async (req, res) => {
  const document = await prisma.documentRecord.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!document) return res.status(404).json({ error: "Document not found" });

  await logActivity({
    projectId: document.project.id,
    projectName: document.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted document "${document.documentNumber}: ${document.title}"`,
  });
  await prisma.documentRecord.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectDocumentsRouter;
