import { Request, Response, Router } from "express";
import { prisma } from "../prisma";
import { describeVariationUpdate, logActivity } from "../activityLog";

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value as string) : null;
}

function parseRequiredDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const projectVariationsRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectVariationsRouter.get(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const variations = await prisma.variation.findMany({
      where: { projectId: req.params.id },
      orderBy: { dateRaised: "desc" },
    });
    res.json(variations);
  }
);

projectVariationsRouter.post(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const {
      reference,
      title,
      description,
      category,
      costImpact,
      timeImpactDays,
      status,
      dateRaised,
      notes,
    } = req.body as Record<string, unknown>;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    const parsedCost = Number(costImpact);
    if (costImpact === undefined || costImpact === null || Number.isNaN(parsedCost)) {
      return res.status(400).json({ error: "A valid cost impact is required" });
    }
    const parsedDateRaised = parseRequiredDate(dateRaised);
    if (!parsedDateRaised) {
      return res.status(400).json({ error: "A valid date raised is required" });
    }
    if (status !== undefined && !["PROPOSED", "APPROVED", "REJECTED"].includes(status as string)) {
      return res.status(400).json({ error: "status must be PROPOSED, APPROVED or REJECTED" });
    }

    const variation = await prisma.variation.create({
      data: {
        projectId: req.params.id,
        reference: (reference as string) || null,
        title: title.trim(),
        description: (description as string) || null,
        category: (category as string) || null,
        costImpact: parsedCost,
        timeImpactDays:
          timeImpactDays === undefined || timeImpactDays === null || timeImpactDays === ""
            ? null
            : Number(timeImpactDays),
        status: (status as "PROPOSED" | "APPROVED" | "REJECTED") ?? "PROPOSED",
        dateRaised: parsedDateRaised,
        dateDecided: status && status !== "PROPOSED" ? new Date() : null,
        notes: (notes as string) || null,
        raisedById: req.user!.sub,
        raisedByName: req.user!.name,
      },
    });

    await logActivity({
      projectId: project.id,
      projectName: project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: `raised variation "${variation.title}"`,
    });

    res.status(201).json(variation);
  }
);

export const variationsRouter = Router();

// Every variation across every project, for the portfolio-wide dashboard
// chart's revised-budget calculation — avoids one request per project.
variationsRouter.get("/", async (_req, res) => {
  const variations = await prisma.variation.findMany({
    orderBy: { dateRaised: "desc" },
  });
  res.json(variations);
});

variationsRouter.put("/:id", async (req, res) => {
  const before = await prisma.variation.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Variation not found" });

  const {
    reference,
    title,
    description,
    category,
    costImpact,
    timeImpactDays,
    status,
    dateRaised,
    dateDecided,
    notes,
  } = req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (reference !== undefined) data.reference = reference || null;
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    data.title = title.trim();
  }
  if (description !== undefined) data.description = description || null;
  if (category !== undefined) data.category = category || null;
  if (costImpact !== undefined) {
    const parsedCost = Number(costImpact);
    if (Number.isNaN(parsedCost)) {
      return res.status(400).json({ error: "A valid cost impact is required" });
    }
    data.costImpact = parsedCost;
  }
  if (timeImpactDays !== undefined) {
    data.timeImpactDays = timeImpactDays === null || timeImpactDays === "" ? null : Number(timeImpactDays);
  }
  if (status !== undefined) {
    if (!["PROPOSED", "APPROVED", "REJECTED"].includes(status as string)) {
      return res.status(400).json({ error: "status must be PROPOSED, APPROVED or REJECTED" });
    }
    data.status = status;
    if (status !== before.status && dateDecided === undefined) {
      data.dateDecided = status === "PROPOSED" ? null : new Date();
    }
  }
  const raised = parseDate(dateRaised);
  if (raised !== undefined) data.dateRaised = raised ?? before.dateRaised;
  const decided = parseDate(dateDecided);
  if (decided !== undefined) data.dateDecided = decided;
  if (notes !== undefined) data.notes = notes || null;

  try {
    const variation = await prisma.variation.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeVariationUpdate(before, data),
    });
    res.json(variation);
  } catch (err) {
    res.status(400).json({ error: "Unable to update variation" });
  }
});

variationsRouter.delete("/:id", async (req, res) => {
  const variation = await prisma.variation.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!variation) return res.status(404).json({ error: "Variation not found" });

  await logActivity({
    projectId: variation.project.id,
    projectName: variation.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted variation "${variation.title}"`,
  });
  await prisma.variation.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectVariationsRouter;
