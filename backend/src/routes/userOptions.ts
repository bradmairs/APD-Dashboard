import { Router } from "express";
import { prisma } from "../prisma";

// A minimal directory of active users (id and name only) for pickers such as
// a project's Project Manager. Open to every signed-in user — unlike
// /api/users, which is the admin-only account management list and exposes
// emails and roles.
const router = Router();

router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  res.json(users);
});

export default router;
