import { Request, Response, Router } from "express";
import { prisma } from "../prisma";
import { logActivity } from "../activityLog";
import { ArchiveError, ArchiveItemType, buildArchiveItemUrl, searchArchive } from "../engineeringArchive";

const VALID_TYPES: ArchiveItemType[] = ["ASSET", "MEDIA", "FILE"];

const projectArchiveLinksRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectArchiveLinksRouter.get(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const links = await prisma.archiveLink.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(links);
  }
);

projectArchiveLinksRouter.post(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const { archiveType, archiveId, label } = req.body as Record<string, unknown>;

    if (typeof archiveType !== "string" || !VALID_TYPES.includes(archiveType as ArchiveItemType)) {
      return res.status(400).json({ error: "archiveType must be ASSET, MEDIA, or FILE" });
    }
    if (typeof archiveId !== "string" || !archiveId.trim()) {
      return res.status(400).json({ error: "archiveId is required" });
    }
    if (typeof label !== "string" || !label.trim()) {
      return res.status(400).json({ error: "label is required" });
    }

    let url: string;
    try {
      url = buildArchiveItemUrl(archiveType as ArchiveItemType, archiveId.trim());
    } catch (err) {
      if (err instanceof ArchiveError) return res.status(503).json({ error: err.message });
      throw err;
    }

    const link = await prisma.archiveLink.create({
      data: {
        projectId: req.params.id,
        archiveType: archiveType as ArchiveItemType,
        archiveId: archiveId.trim(),
        label: label.trim(),
        url,
        createdById: req.user!.sub,
        createdByName: req.user!.name,
      },
    });

    await logActivity({
      projectId: project.id,
      projectName: project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: `linked "${link.label}" from the Engineering Archive`,
    });

    res.status(201).json(link);
  }
);

export const archiveLinksRouter = Router();

archiveLinksRouter.delete("/:id", async (req, res) => {
  const link = await prisma.archiveLink.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!link) return res.status(404).json({ error: "Link not found" });

  await logActivity({
    projectId: link.project.id,
    projectName: link.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `removed the Engineering Archive link "${link.label}"`,
  });
  await prisma.archiveLink.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// Proxies the Archive's own /api/search so the frontend never needs to know
// its URL or hold its API key — the browser only ever talks to this app.
export const archiveSearchRouter = Router();

archiveSearchRouter.get("/", async (req: Request<{}, {}, {}, { q?: string }>, res: Response) => {
  const q = req.query.q?.trim();
  if (!q) return res.json({ query: "", assets: [], media: [], files: [] });

  try {
    const results = await searchArchive(q);
    res.json(results);
  } catch (err) {
    if (err instanceof ArchiveError) return res.status(503).json({ error: err.message });
    res.status(500).json({ error: "Failed to search the Engineering Archive" });
  }
});

export default projectArchiveLinksRouter;
