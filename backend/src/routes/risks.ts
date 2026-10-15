import { Request, Response, Router } from "express";
import { RiskConsequence, RiskLikelihood, RiskStatus, RiskType } from "@prisma/client";
import { prisma } from "../prisma";
import { describeRiskUpdate, logActivity } from "../activityLog";

const RISK_TYPES = ["RISK", "OPPORTUNITY"];
const LIKELIHOODS = ["RARE", "UNLIKELY", "POSSIBLE", "LIKELY", "ALMOST_CERTAIN"];
const CONSEQUENCES = ["INSIGNIFICANT", "MINOR", "MODERATE", "MAJOR", "SEVERE"];
const STATUSES = ["OPEN", "MITIGATING", "CLOSED"];

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value as string) : null;
}

const projectRisksRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectRisksRouter.get("/", async (req: Request<ProjectParams>, res: Response) => {
  const risks = await prisma.risk.findMany({
    where: { projectId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(risks);
});

projectRisksRouter.post("/", async (req: Request<ProjectParams>, res: Response) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const {
    type,
    title,
    description,
    category,
    inherentLikelihood,
    inherentConsequence,
    residualLikelihood,
    residualConsequence,
    mitigation,
    ownerName,
    dueDate,
    status,
  } = req.body as Record<string, unknown>;

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }
  if (!LIKELIHOODS.includes(inherentLikelihood as string)) {
    return res.status(400).json({ error: "A valid inherent likelihood is required" });
  }
  if (!CONSEQUENCES.includes(inherentConsequence as string)) {
    return res.status(400).json({ error: "A valid inherent consequence is required" });
  }
  if (type !== undefined && !RISK_TYPES.includes(type as string)) {
    return res.status(400).json({ error: "type must be RISK or OPPORTUNITY" });
  }
  if (
    residualLikelihood !== undefined &&
    residualLikelihood !== null &&
    residualLikelihood !== "" &&
    !LIKELIHOODS.includes(residualLikelihood as string)
  ) {
    return res.status(400).json({ error: "residualLikelihood is invalid" });
  }
  if (
    residualConsequence !== undefined &&
    residualConsequence !== null &&
    residualConsequence !== "" &&
    !CONSEQUENCES.includes(residualConsequence as string)
  ) {
    return res.status(400).json({ error: "residualConsequence is invalid" });
  }
  if (status !== undefined && !STATUSES.includes(status as string)) {
    return res.status(400).json({ error: "status must be OPEN, MITIGATING or CLOSED" });
  }

  const risk = await prisma.risk.create({
    data: {
      projectId: req.params.id,
      type: (type as RiskType) ?? "RISK",
      title: title.trim(),
      description: (description as string) || null,
      category: (category as string) || null,
      inherentLikelihood: inherentLikelihood as RiskLikelihood,
      inherentConsequence: inherentConsequence as RiskConsequence,
      residualLikelihood: (residualLikelihood as RiskLikelihood) || null,
      residualConsequence: (residualConsequence as RiskConsequence) || null,
      mitigation: (mitigation as string) || null,
      ownerName: (ownerName as string) || null,
      dueDate: dueDate ? new Date(dueDate as string) : null,
      status: (status as RiskStatus) ?? "OPEN",
      createdById: req.user!.sub,
      createdByName: req.user!.name,
    },
  });

  await logActivity({
    projectId: project.id,
    projectName: project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `added ${risk.type === "OPPORTUNITY" ? "opportunity" : "risk"} "${risk.title}"`,
  });

  res.status(201).json(risk);
});

export const risksRouter = Router();

// Every risk across every project, for the portfolio-wide Top Risks panel
// on the dashboard — avoids one request per project.
risksRouter.get("/", async (_req, res) => {
  const risks = await prisma.risk.findMany({
    orderBy: { createdAt: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
  res.json(risks);
});

risksRouter.put("/:id", async (req, res) => {
  const before = await prisma.risk.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Risk not found" });

  const {
    type,
    title,
    description,
    category,
    inherentLikelihood,
    inherentConsequence,
    residualLikelihood,
    residualConsequence,
    mitigation,
    ownerName,
    dueDate,
    status,
  } = req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (type !== undefined) {
    if (!RISK_TYPES.includes(type as string)) {
      return res.status(400).json({ error: "type must be RISK or OPPORTUNITY" });
    }
    data.type = type;
  }
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    data.title = title.trim();
  }
  if (description !== undefined) data.description = description || null;
  if (category !== undefined) data.category = category || null;
  if (inherentLikelihood !== undefined) {
    if (!LIKELIHOODS.includes(inherentLikelihood as string)) {
      return res.status(400).json({ error: "A valid inherent likelihood is required" });
    }
    data.inherentLikelihood = inherentLikelihood;
  }
  if (inherentConsequence !== undefined) {
    if (!CONSEQUENCES.includes(inherentConsequence as string)) {
      return res.status(400).json({ error: "A valid inherent consequence is required" });
    }
    data.inherentConsequence = inherentConsequence;
  }
  if (residualLikelihood !== undefined) {
    data.residualLikelihood = residualLikelihood || null;
  }
  if (residualConsequence !== undefined) {
    data.residualConsequence = residualConsequence || null;
  }
  if (mitigation !== undefined) data.mitigation = mitigation || null;
  if (ownerName !== undefined) data.ownerName = ownerName || null;
  const due = parseDate(dueDate);
  if (due !== undefined) data.dueDate = due;
  if (status !== undefined) {
    if (!STATUSES.includes(status as string)) {
      return res.status(400).json({ error: "status must be OPEN, MITIGATING or CLOSED" });
    }
    data.status = status;
  }

  try {
    const risk = await prisma.risk.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeRiskUpdate(before, data),
    });
    res.json(risk);
  } catch (err) {
    res.status(400).json({ error: "Unable to update risk" });
  }
});

risksRouter.delete("/:id", async (req, res) => {
  const risk = await prisma.risk.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!risk) return res.status(404).json({ error: "Risk not found" });

  await logActivity({
    projectId: risk.project.id,
    projectName: risk.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted ${risk.type === "OPPORTUNITY" ? "opportunity" : "risk"} "${risk.title}"`,
  });
  await prisma.risk.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectRisksRouter;
