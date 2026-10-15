import { Router } from "express";
import { prisma } from "../prisma";

const router = Router();

router.get("/recent", async (_req, res) => {
  const entries = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 15,
  });
  res.json(entries);
});

export default router;
