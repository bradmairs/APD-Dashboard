import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma";

const router = Router();

router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      twoFactorEnabled: true,
    },
    orderBy: { name: "asc" },
  });
  res.json(users);
});

router.post("/", async (req, res) => {
  const { name, email, password, role } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: "ADMIN" | "MEMBER" | "VIEWER";
  };
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  if (role && role !== "ADMIN" && role !== "MEMBER" && role !== "VIEWER") {
    return res.status(400).json({ error: "Role must be ADMIN, MEMBER, or VIEWER" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const resolvedRole = role || "MEMBER";
    const user = await prisma.user.create({
      data: { name, email: email.toLowerCase(), passwordHash, role: resolvedRole },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(409).json({ error: "A user with that email already exists" });
  }
});

router.put("/:id", async (req, res) => {
  const { role, active } = req.body as {
    role?: "ADMIN" | "MEMBER" | "VIEWER";
    active?: boolean;
  };
  if (role === undefined && active === undefined) {
    return res.status(400).json({ error: "Nothing to update" });
  }
  if (role !== undefined && role !== "ADMIN" && role !== "MEMBER" && role !== "VIEWER") {
    return res.status(400).json({ error: "Role must be ADMIN, MEMBER, or VIEWER" });
  }
  if (active !== undefined && typeof active !== "boolean") {
    return res.status(400).json({ error: "active must be true or false" });
  }
  if (req.params.id === req.user!.sub) {
    if (role !== undefined && role !== "ADMIN") {
      return res.status(400).json({ error: "You can't remove your own admin access" });
    }
    if (active === false) {
      return res.status(400).json({ error: "You can't deactivate your own account" });
    }
  }

  const data: { role?: "ADMIN" | "MEMBER" | "VIEWER"; active?: boolean } = {};
  if (role !== undefined) data.role = role;
  if (active !== undefined) data.active = active;

  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    res.json(user);
  } catch (err) {
    res.status(404).json({ error: "User not found" });
  }
});

// Permanently removes an account. Every record the user created keeps its
// stored name (raisedByName etc.) because those foreign keys are SET NULL, and
// their live session stops working at once since
// requireAuth looks the user up on every request. An admin can't delete their own
// account, which also guarantees at least one active admin always remains.
router.delete("/:id", async (req, res) => {
  if (req.params.id === req.user!.sub) {
    return res.status(400).json({ error: "You can't delete your own account" });
  }
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "User not found" });
  }
});

// Lets an admin switch off two-factor auth for someone who has lost both their
// authenticator and their recovery codes. They sign in with just their
// password afterwards and can enrol again from the user menu.
router.post("/:id/2fa/reset", async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorLastStep: null,
        twoFactorRecoveryHashes: [],
      },
    });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "User not found" });
  }
});

// Lets an admin switch off two-factor auth for someone who has lost both their
// authenticator and their recovery codes. They sign in with just their
// password afterwards and can enrol again from the user menu.
router.post("/:id/2fa/reset", async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorLastStep: null,
        twoFactorRecoveryHashes: [],
      },
    });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "User not found" });
  }
});

export default router;
