import { Router } from "express";
import { prisma } from "../prisma";

// GET /api/history?projectId=[&entityType=&entityId=] — field changes,
// newest first (3.0).
const router = Router();

router.get("/", async (req, res) => {
  const { projectId, entityType, entityId } = req.query as Record<string, string | undefined>;
  if (!projectId) return res.status(400).json({ error: "projectId is required" });
  const where: Record<string, unknown> = { projectId };
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  const rows = await prisma.fieldChange.findMany({ where, orderBy: { createdAt: "desc" }, take: 500 });
  res.json(rows);
});

export default router;
