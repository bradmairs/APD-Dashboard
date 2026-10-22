import { Request, Response, Router } from "express";
import { prisma } from "../prisma";
import { logActivity } from "../activityLog";

// Tender submissions and their assessment (price, conformance, score, rank,
// recommendation), one row per tenderer per tender package. Shown on the
// project's Procurement tab.

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseDecimal(value: unknown, max?: number): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  if (max !== undefined && parsed > max) return undefined;
  return parsed;
}

function parseRank(value: unknown): number | null | undefined {
  const parsed = parseDecimal(value);
  if (parsed === undefined || parsed === null) return parsed;
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : undefined;
}

function parseConforming(value: unknown): boolean | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return typeof value === "boolean" ? value : undefined;
}

// Validates the editable fields present in the body. Returns the data to
// write, or an error message.
function readFields(body: Record<string, unknown>): Record<string, unknown> | string {
  const data: Record<string, unknown> = {};
  if (body.tendererName !== undefined) {
    if (typeof body.tendererName !== "string" || !body.tendererName.trim()) {
      return "Tenderer name is required";
    }
    data.tendererName = body.tendererName.trim();
  }
  const checks: [string, unknown, string][] = [
    ["dateReceived", parseDate(body.dateReceived), "Invalid date received"],
    ["tenderPrice", parseDecimal(body.tenderPrice), "Tender price must be a positive number"],
    ["score", parseDecimal(body.score, 100), "Score must be between 0 and 100"],
    ["rank", parseRank(body.rank), "Rank must be a whole number of 1 or more"],
    ["conforming", parseConforming(body.conforming), "Conforming must be yes, no or blank"],
  ];
  for (const [field, parsed, error] of checks) {
    if (body[field] === undefined) continue;
    if (parsed === undefined) return error;
    data[field] = parsed;
  }
  if (body.recommended !== undefined) {
    if (typeof body.recommended !== "boolean") return "recommended must be true or false";
    data.recommended = body.recommended;
  }
  if (body.notes !== undefined) {
    data.notes = typeof body.notes === "string" && body.notes.trim() ? body.notes : null;
  }
  return data;
}

// GET /api/projects/:id/tender-submissions — every submission on the
// project's packages, for the Procurement tab.
export const projectTenderSubmissionsRouter = Router({ mergeParams: true });

projectTenderSubmissionsRouter.get(
  "/",
  async (req: Request<{ id: string }>, res: Response) => {
    const submissions = await prisma.tenderSubmission.findMany({
      where: { tenderPackage: { projectId: req.params.id } },
      orderBy: [{ rank: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    });
    res.json(submissions);
  }
);

// POST /api/tender-packages/:id/submissions
export const packageTenderSubmissionsRouter = Router({ mergeParams: true });

packageTenderSubmissionsRouter.post(
  "/",
  async (req: Request<{ id: string }>, res: Response) => {
    const tenderPackage = await prisma.tenderPackage.findUnique({
      where: { id: req.params.id },
      include: { project: { select: { id: true, name: true } } },
    });
    if (!tenderPackage) return res.status(404).json({ error: "Tender package not found" });

    const body = req.body as Record<string, unknown>;
    if (body.tendererName === undefined) {
      return res.status(400).json({ error: "Tenderer name is required" });
    }
    const fields = readFields(body);
    if (typeof fields === "string") return res.status(400).json({ error: fields });

    const submission = await prisma.tenderSubmission.create({
      data: {
        ...(fields as { tendererName: string }),
        tenderPackageId: tenderPackage.id,
        createdById: req.user!.sub,
        createdByName: req.user!.name,
      },
    });
    await logActivity({
      projectId: tenderPackage.project.id,
      projectName: tenderPackage.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: `recorded a tender submission from ${submission.tendererName} for "${tenderPackage.title}"`,
    });
    res.status(201).json(submission);
  }
);

// PUT/DELETE /api/tender-submissions/:id
export const tenderSubmissionsRouter = Router();

async function loadWithProject(id: string) {
  return prisma.tenderSubmission.findUnique({
    where: { id },
    include: {
      tenderPackage: {
        select: { title: true, project: { select: { id: true, name: true } } },
      },
    },
  });
}

tenderSubmissionsRouter.put("/:id", async (req, res) => {
  const before = await loadWithProject(req.params.id);
  if (!before) return res.status(404).json({ error: "Tender submission not found" });
  const fields = readFields(req.body as Record<string, unknown>);
  if (typeof fields === "string") return res.status(400).json({ error: fields });
  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }
  const submission = await prisma.tenderSubmission.update({
    where: { id: req.params.id },
    data: fields,
  });
  await logActivity({
    projectId: before.tenderPackage.project.id,
    projectName: before.tenderPackage.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `updated the tender submission from ${submission.tendererName} for "${before.tenderPackage.title}"`,
  });
  res.json(submission);
});

tenderSubmissionsRouter.delete("/:id", async (req, res) => {
  const submission = await loadWithProject(req.params.id);
  if (!submission) return res.status(404).json({ error: "Tender submission not found" });
  await logActivity({
    projectId: submission.tenderPackage.project.id,
    projectName: submission.tenderPackage.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted the tender submission from ${submission.tendererName} for "${submission.tenderPackage.title}"`,
  });
  await prisma.tenderSubmission.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
