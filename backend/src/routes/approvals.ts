import { Router } from "express";
import { prisma } from "../prisma";
import { logActivity } from "../activityLog";

// Approvals (3.0): a variation or payment claim is sent to a named person,
// who approves or rejects it with a comment. Every request and decision is
// kept, so the delegation trail is on record. Approving a variation also
// sets its status to Approved (and rejecting, to Rejected); a payment claim's
// own status is left for the project team to set when it's certified.

const router = Router();
const ENTITY_TYPES = ["variation", "paymentClaim"] as const;

async function loadEntity(entityType: string, entityId: string) {
  if (entityType === "variation") {
    const v = await prisma.variation.findUnique({ where: { id: entityId } });
    return v && { projectId: v.projectId, label: `Variation ${v.reference ?? ""} ${v.title}`.replace(/\s+/g, " ").trim(), amount: v.costImpact };
  }
  if (entityType === "paymentClaim") {
    const c = await prisma.paymentClaim.findUnique({ where: { id: entityId } });
    return c && { projectId: c.projectId, label: `Payment claim ${c.claimNumber}`, amount: c.claimedAmount };
  }
  return null;
}

// GET /api/approvals?mine=pending | ?projectId= | ?entityType=&entityId=
router.get("/", async (req, res) => {
  const { mine, projectId, entityType, entityId } = req.query as Record<string, string | undefined>;
  const where: Record<string, unknown> = {};
  if (mine === "pending") {
    where.approverId = req.user!.sub;
    where.status = "PENDING";
  } else if (mine === "requested") {
    where.requestedById = req.user!.sub;
  }
  if (projectId) where.projectId = projectId;
  if (entityType && entityId) {
    where.entityType = entityType;
    where.entityId = entityId;
  }
  const rows = await prisma.approvalRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { project: { select: { id: true, name: true } } },
  });
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { entityType, entityId, approverId, note } = req.body as Record<string, unknown>;
  if (typeof entityType !== "string" || !(ENTITY_TYPES as readonly string[]).includes(entityType)) {
    return res.status(400).json({ error: "Approvals are for variations and payment claims" });
  }
  if (typeof entityId !== "string" || typeof approverId !== "string") {
    return res.status(400).json({ error: "Choose what to approve and who approves it" });
  }
  const [entity, approver] = await Promise.all([
    loadEntity(entityType, entityId),
    prisma.user.findUnique({ where: { id: approverId }, select: { id: true, name: true, active: true, role: true } }),
  ]);
  if (!entity) return res.status(404).json({ error: "Record not found" });
  if (!approver || !approver.active || approver.role === "VIEWER") {
    return res.status(400).json({ error: "Choose an active user who can approve" });
  }
  const open = await prisma.approvalRequest.findFirst({ where: { entityType, entityId, status: "PENDING" } });
  if (open) return res.status(409).json({ error: `Already waiting on ${open.approverName}` });

  const request = await prisma.approvalRequest.create({
    data: {
      projectId: entity.projectId,
      entityType,
      entityId,
      entityLabel: entity.label,
      amount: entity.amount,
      requestedById: req.user!.sub,
      requestedByName: req.user!.name,
      approverId: approver.id,
      approverName: approver.name,
      note: typeof note === "string" && note.trim() ? note.trim().slice(0, 2000) : null,
    },
    include: { project: { select: { id: true, name: true } } },
  });
  await logActivity({
    projectId: entity.projectId,
    projectName: request.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `requested approval of ${entity.label} from ${approver.name}`,
  });
  res.status(201).json(request);
});

// POST /api/approvals/:id/decide { decision: "APPROVED" | "REJECTED", comment }
router.post("/:id/decide", async (req, res) => {
  const { decision, comment } = req.body as Record<string, unknown>;
  if (decision !== "APPROVED" && decision !== "REJECTED") {
    return res.status(400).json({ error: "Approve or reject" });
  }
  const request = await prisma.approvalRequest.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!request) return res.status(404).json({ error: "Approval not found" });
  if (request.status !== "PENDING") return res.status(409).json({ error: "This has already been decided" });
  if (request.approverId !== req.user!.sub && req.user!.role !== "ADMIN") {
    return res.status(403).json({ error: `Only ${request.approverName} (or an admin) can decide this` });
  }
  const text = typeof comment === "string" && comment.trim() ? comment.trim().slice(0, 2000) : null;
  if (decision === "REJECTED" && !text) {
    return res.status(400).json({ error: "Say why it's rejected" });
  }
  const decided = await prisma.approvalRequest.update({
    where: { id: request.id },
    data: { status: decision, decisionComment: text, decidedAt: new Date() },
    include: { project: { select: { id: true, name: true } } },
  });
  if (request.entityType === "variation") {
    await prisma.variation
      .update({ where: { id: request.entityId }, data: { status: decision, dateDecided: new Date() } })
      .catch(() => undefined);
  }
  const by = request.approverId === req.user!.sub ? "" : ` on behalf of ${request.approverName}`;
  await logActivity({
    projectId: request.projectId,
    projectName: request.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `${decision === "APPROVED" ? "approved" : "rejected"} ${request.entityLabel}${by}${text ? `: "${text}"` : ""}`,
  });
  res.json(decided);
});

router.post("/:id/cancel", async (req, res) => {
  const request = await prisma.approvalRequest.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!request) return res.status(404).json({ error: "Approval not found" });
  if (request.status !== "PENDING") return res.status(409).json({ error: "This has already been decided" });
  if (request.requestedById !== req.user!.sub && req.user!.role !== "ADMIN") {
    return res.status(403).json({ error: "Only the person who asked (or an admin) can withdraw it" });
  }
  const cancelled = await prisma.approvalRequest.update({
    where: { id: request.id },
    data: { status: "CANCELLED", decidedAt: new Date() },
  });
  await logActivity({
    projectId: request.projectId,
    projectName: request.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `withdrew the approval request for ${request.entityLabel}`,
  });
  res.json(cancelled);
});

export default router;
