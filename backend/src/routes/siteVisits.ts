import { Request, Response, Router } from "express";
import { prisma } from "../prisma";
import { describeSiteVisitUpdate, logActivity } from "../activityLog";
import projectSiteVisitPhotosRouter from "./siteVisitPhotos";

function parseVisitDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const projectSiteVisitsRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectSiteVisitsRouter.get(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const siteVisits = await prisma.siteVisit.findMany({
      where: { projectId: req.params.id },
      orderBy: { visitDate: "desc" },
    });
    res.json(siteVisits);
  }
);

projectSiteVisitsRouter.post(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const { visitDate, location, notes, discussionNotes } = req.body as Record<
      string,
      unknown
    >;

    const parsedDate = parseVisitDate(visitDate);
    if (!parsedDate) {
      return res.status(400).json({ error: "A valid visit date is required" });
    }
    if (typeof location !== "string" || !location.trim()) {
      return res.status(400).json({ error: "Location is required" });
    }

    const siteVisit = await prisma.siteVisit.create({
      data: {
        projectId: req.params.id,
        visitDate: parsedDate,
        location: location.trim(),
        notes: (notes as string) || null,
        discussionNotes: (discussionNotes as string) || null,
        visitedById: req.user!.sub,
        visitedByName: req.user!.name,
      },
    });

    await logActivity({
      projectId: project.id,
      projectName: project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: `logged a site visit at ${siteVisit.location}`,
    });

    res.status(201).json(siteVisit);
  }
);

export const siteVisitsRouter = Router();

siteVisitsRouter.use("/:id/photos", projectSiteVisitPhotosRouter);

siteVisitsRouter.put("/:id", async (req, res) => {
  const before = await prisma.siteVisit.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Site visit not found" });

  const { visitDate, location, notes, discussionNotes } = req.body as Record<
    string,
    unknown
  >;

  const data: Record<string, unknown> = {};

  if (visitDate !== undefined) {
    const parsedDate = parseVisitDate(visitDate);
    if (!parsedDate) {
      return res.status(400).json({ error: "A valid visit date is required" });
    }
    data.visitDate = parsedDate;
  }
  if (location !== undefined) {
    if (typeof location !== "string" || !location.trim()) {
      return res.status(400).json({ error: "Location is required" });
    }
    data.location = location.trim();
  }
  if (notes !== undefined) data.notes = notes || null;
  if (discussionNotes !== undefined) data.discussionNotes = discussionNotes || null;

  try {
    const siteVisit = await prisma.siteVisit.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeSiteVisitUpdate(before, data),
    });
    res.json(siteVisit);
  } catch (err) {
    res.status(400).json({ error: "Unable to update site visit" });
  }
});

siteVisitsRouter.delete("/:id", async (req, res) => {
  const siteVisit = await prisma.siteVisit.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!siteVisit) return res.status(404).json({ error: "Site visit not found" });

  await logActivity({
    projectId: siteVisit.project.id,
    projectName: siteVisit.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted the site visit at ${siteVisit.location}`,
  });
  await prisma.siteVisit.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectSiteVisitsRouter;
