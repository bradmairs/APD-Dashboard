import { Request, Response, Router } from "express";
import { TenderMethod, TenderStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { describeTenderPackageUpdate, logActivity } from "../activityLog";

const METHODS = ["OPEN", "SELECTIVE", "DIRECT_ENGAGE", "EXPRESSION_OF_INTEREST"];
const STATUSES = ["PLANNED", "ISSUED", "EVALUATION", "AWARDED", "CANCELLED"];

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value as string) : null;
}

function parseDecimal(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseInt_(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
}

const projectTenderPackagesRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectTenderPackagesRouter.get(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const packages = await prisma.tenderPackage.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(packages);
  }
);

projectTenderPackagesRouter.post(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const {
      packageNumber,
      title,
      description,
      method,
      status,
      dateIssued,
      closingDate,
      submissionsReceived,
      estimatedValue,
      awardedTo,
      awardedValue,
      dateAwarded,
      notes,
    } = req.body as Record<string, unknown>;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (method !== undefined && !METHODS.includes(method as string)) {
      return res.status(400).json({ error: "Invalid tender method" });
    }
    if (status !== undefined && !STATUSES.includes(status as string)) {
      return res.status(400).json({ error: "Invalid tender status" });
    }

    const parsedSubmissions = parseInt_(submissionsReceived);
    if (parsedSubmissions === undefined) {
      return res.status(400).json({ error: "Submissions received must be a number" });
    }
    const parsedEstimatedValue = parseDecimal(estimatedValue);
    if (parsedEstimatedValue === undefined) {
      return res.status(400).json({ error: "Estimated value must be a number" });
    }
    const parsedAwardedValue = parseDecimal(awardedValue);
    if (parsedAwardedValue === undefined) {
      return res.status(400).json({ error: "Awarded value must be a number" });
    }

    const resolvedStatus = (status as TenderStatus) ?? "PLANNED";

    const tenderPackage = await prisma.tenderPackage.create({
      data: {
        projectId: req.params.id,
        packageNumber: (packageNumber as string) || null,
        title: title.trim(),
        description: (description as string) || null,
        method: (method as TenderMethod) ?? "OPEN",
        status: resolvedStatus,
        dateIssued: parseDate(dateIssued) ?? null,
        closingDate: parseDate(closingDate) ?? null,
        submissionsReceived: parsedSubmissions,
        estimatedValue: parsedEstimatedValue,
        awardedTo: (awardedTo as string) || null,
        awardedValue: parsedAwardedValue,
        dateAwarded:
          resolvedStatus === "AWARDED" ? parseDate(dateAwarded) ?? new Date() : null,
        notes: (notes as string) || null,
        managedById: req.user!.sub,
        managedByName: req.user!.name,
      },
    });

    await logActivity({
      projectId: project.id,
      projectName: project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: `raised tender package "${tenderPackage.title}"`,
    });

    res.status(201).json(tenderPackage);
  }
);

export const tenderPackagesRouter = Router();

// Every tender package across every project, for the portfolio-wide Active
// Tenders panel on the dashboard — avoids one request per project.
tenderPackagesRouter.get("/", async (_req, res) => {
  const packages = await prisma.tenderPackage.findMany({
    orderBy: { createdAt: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
  res.json(packages);
});

tenderPackagesRouter.put("/:id", async (req, res) => {
  const before = await prisma.tenderPackage.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Tender package not found" });

  const {
    packageNumber,
    title,
    description,
    method,
    status,
    dateIssued,
    closingDate,
    submissionsReceived,
    estimatedValue,
    awardedTo,
    awardedValue,
    dateAwarded,
    notes,
  } = req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (packageNumber !== undefined) data.packageNumber = packageNumber || null;
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    data.title = title.trim();
  }
  if (description !== undefined) data.description = description || null;
  if (method !== undefined) {
    if (!METHODS.includes(method as string)) {
      return res.status(400).json({ error: "Invalid tender method" });
    }
    data.method = method;
  }

  const issuedDate = parseDate(dateIssued);
  if (issuedDate !== undefined) data.dateIssued = issuedDate;
  const closeDate = parseDate(closingDate);
  if (closeDate !== undefined) data.closingDate = closeDate;

  if (submissionsReceived !== undefined) {
    const parsed = parseInt_(submissionsReceived);
    if (parsed === undefined) {
      return res.status(400).json({ error: "Submissions received must be a number" });
    }
    data.submissionsReceived = parsed;
  }
  if (estimatedValue !== undefined) {
    const parsed = parseDecimal(estimatedValue);
    if (parsed === undefined) {
      return res.status(400).json({ error: "Estimated value must be a number" });
    }
    data.estimatedValue = parsed;
  }
  if (awardedTo !== undefined) data.awardedTo = awardedTo || null;
  if (awardedValue !== undefined) {
    const parsed = parseDecimal(awardedValue);
    if (parsed === undefined) {
      return res.status(400).json({ error: "Awarded value must be a number" });
    }
    data.awardedValue = parsed;
  }
  if (notes !== undefined) data.notes = notes || null;

  if (status !== undefined) {
    if (!STATUSES.includes(status as string)) {
      return res.status(400).json({ error: "Invalid tender status" });
    }
    data.status = status;
    if (status !== before.status) {
      const explicitAwardedDate = parseDate(dateAwarded);
      data.dateAwarded =
        status === "AWARDED" ? explicitAwardedDate ?? new Date() : null;
    }
  }

  try {
    const tenderPackage = await prisma.tenderPackage.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeTenderPackageUpdate(before, data),
    });
    res.json(tenderPackage);
  } catch (err) {
    res.status(400).json({ error: "Unable to update tender package" });
  }
});

tenderPackagesRouter.delete("/:id", async (req, res) => {
  const tenderPackage = await prisma.tenderPackage.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!tenderPackage) return res.status(404).json({ error: "Tender package not found" });

  await logActivity({
    projectId: tenderPackage.project.id,
    projectName: tenderPackage.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted the tender package "${tenderPackage.title}"`,
  });
  await prisma.tenderPackage.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectTenderPackagesRouter;
