import { Request, Response, Router } from "express";
import { PermitStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { describePermitUpdate, logActivity } from "../activityLog";

const STATUSES = ["PENDING", "APPROVED", "REJECTED"];

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value as string) : null;
}

const projectPermitsRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectPermitsRouter.get(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const permits = await prisma.permit.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(permits);
  }
);

projectPermitsRouter.post(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const {
      title,
      category,
      referenceNumber,
      issuingAuthority,
      status,
      dateApplied,
      dateApproved,
      expiryDate,
      notes,
    } = req.body as Record<string, unknown>;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (status !== undefined && !STATUSES.includes(status as string)) {
      return res.status(400).json({ error: "status must be PENDING, APPROVED or REJECTED" });
    }

    const permit = await prisma.permit.create({
      data: {
        projectId: req.params.id,
        title: title.trim(),
        category: (category as string) || null,
        referenceNumber: (referenceNumber as string) || null,
        issuingAuthority: (issuingAuthority as string) || null,
        status: (status as PermitStatus) ?? "PENDING",
        dateApplied: dateApplied ? new Date(dateApplied as string) : null,
        dateApproved: dateApproved ? new Date(dateApproved as string) : null,
        expiryDate: expiryDate ? new Date(expiryDate as string) : null,
        notes: (notes as string) || null,
        createdById: req.user!.sub,
        createdByName: req.user!.name,
      },
    });

    await logActivity({
      projectId: project.id,
      projectName: project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: `added permit "${permit.title}"`,
    });

    res.status(201).json(permit);
  }
);

export const permitsRouter = Router();

// Every permit across every project, for the portfolio-wide Expiring
// Permits panel on the dashboard — avoids one request per project.
permitsRouter.get("/", async (_req, res) => {
  const permits = await prisma.permit.findMany({
    orderBy: { createdAt: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
  res.json(permits);
});

permitsRouter.put("/:id", async (req, res) => {
  const before = await prisma.permit.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Permit not found" });

  const {
    title,
    category,
    referenceNumber,
    issuingAuthority,
    status,
    dateApplied,
    dateApproved,
    expiryDate,
    notes,
  } = req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    data.title = title.trim();
  }
  if (category !== undefined) data.category = category || null;
  if (referenceNumber !== undefined) data.referenceNumber = referenceNumber || null;
  if (issuingAuthority !== undefined) data.issuingAuthority = issuingAuthority || null;
  if (status !== undefined) {
    if (!STATUSES.includes(status as string)) {
      return res.status(400).json({ error: "status must be PENDING, APPROVED or REJECTED" });
    }
    data.status = status;
  }
  const applied = parseDate(dateApplied);
  if (applied !== undefined) data.dateApplied = applied;
  const approved = parseDate(dateApproved);
  if (approved !== undefined) data.dateApproved = approved;
  const expiry = parseDate(expiryDate);
  if (expiry !== undefined) data.expiryDate = expiry;
  if (notes !== undefined) data.notes = notes || null;

  try {
    const permit = await prisma.permit.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describePermitUpdate(before, data),
    });
    res.json(permit);
  } catch (err) {
    res.status(400).json({ error: "Unable to update permit" });
  }
});

permitsRouter.delete("/:id", async (req, res) => {
  const permit = await prisma.permit.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!permit) return res.status(404).json({ error: "Permit not found" });

  await logActivity({
    projectId: permit.project.id,
    projectName: permit.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted permit "${permit.title}"`,
  });
  await prisma.permit.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectPermitsRouter;
