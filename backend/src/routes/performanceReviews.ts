import { Request, Response, Router } from "express";
import { prisma } from "../prisma";
import { describePerformanceReviewUpdate, logActivity } from "../activityLog";

const RATING_FIELDS = [
  "qualityRating",
  "safetyRating",
  "timelinessRating",
  "communicationRating",
] as const;

function parseRating(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) return null;
  return parsed;
}

const projectPerformanceReviewsRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectPerformanceReviewsRouter.get(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const reviews = await prisma.performanceReview.findMany({
      where: { projectId: req.params.id },
      orderBy: { reviewDate: "desc" },
    });
    res.json(reviews);
  }
);

projectPerformanceReviewsRouter.post(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const body = req.body as Record<string, unknown>;
    const { revieweeName, reviewPeriod, reviewDate, comments } = body;

    if (typeof revieweeName !== "string" || !revieweeName.trim()) {
      return res.status(400).json({ error: "Reviewee name is required" });
    }
    if (!reviewDate) {
      return res.status(400).json({ error: "Review date is required" });
    }

    const ratings: Record<string, number> = {};
    for (const field of RATING_FIELDS) {
      const parsed = parseRating(body[field]);
      if (parsed === null) {
        return res.status(400).json({ error: `${field} must be an integer from 1 to 5` });
      }
      ratings[field] = parsed;
    }

    const review = await prisma.performanceReview.create({
      data: {
        projectId: req.params.id,
        revieweeName: revieweeName.trim(),
        reviewPeriod: (reviewPeriod as string) || null,
        reviewDate: new Date(reviewDate as string),
        qualityRating: ratings.qualityRating,
        safetyRating: ratings.safetyRating,
        timelinessRating: ratings.timelinessRating,
        communicationRating: ratings.communicationRating,
        comments: (comments as string) || null,
        reviewedById: req.user!.sub,
        reviewedByName: req.user!.name,
      },
    });

    await logActivity({
      projectId: project.id,
      projectName: project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: `added a performance review for "${review.revieweeName}"`,
    });

    res.status(201).json(review);
  }
);

export const performanceReviewsRouter = Router();

// Every performance review across every project, for a portfolio-wide Low
// Performing Contractors panel on the dashboard — avoids one request per
// project.
performanceReviewsRouter.get("/", async (_req, res) => {
  const reviews = await prisma.performanceReview.findMany({
    orderBy: { reviewDate: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
  res.json(reviews);
});

performanceReviewsRouter.put("/:id", async (req, res) => {
  const before = await prisma.performanceReview.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Performance review not found" });

  const body = req.body as Record<string, unknown>;
  const { revieweeName, reviewPeriod, reviewDate, comments } = body;

  const data: Record<string, unknown> = {};

  if (revieweeName !== undefined) {
    if (typeof revieweeName !== "string" || !revieweeName.trim()) {
      return res.status(400).json({ error: "Reviewee name is required" });
    }
    data.revieweeName = revieweeName.trim();
  }
  if (reviewPeriod !== undefined) data.reviewPeriod = reviewPeriod || null;
  if (reviewDate !== undefined) data.reviewDate = new Date(reviewDate as string);
  if (comments !== undefined) data.comments = comments || null;

  for (const field of RATING_FIELDS) {
    if (body[field] !== undefined) {
      const parsed = parseRating(body[field]);
      if (parsed === null) {
        return res.status(400).json({ error: `${field} must be an integer from 1 to 5` });
      }
      data[field] = parsed;
    }
  }

  try {
    const review = await prisma.performanceReview.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describePerformanceReviewUpdate(before),
    });
    res.json(review);
  } catch (err) {
    res.status(400).json({ error: "Unable to update performance review" });
  }
});

performanceReviewsRouter.delete("/:id", async (req, res) => {
  const review = await prisma.performanceReview.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!review) return res.status(404).json({ error: "Performance review not found" });

  await logActivity({
    projectId: review.project.id,
    projectName: review.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted the performance review for "${review.revieweeName}"`,
  });
  await prisma.performanceReview.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectPerformanceReviewsRouter;
