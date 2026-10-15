import { Request, Response, Router } from "express";
import { prisma } from "../prisma";
import { describeStakeholderUpdate, logActivity } from "../activityLog";

const projectStakeholdersRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectStakeholdersRouter.get(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const stakeholders = await prisma.stakeholder.findMany({
      where: { projectId: req.params.id },
      orderBy: { name: "asc" },
    });
    res.json(stakeholders);
  }
);

projectStakeholdersRouter.post(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const { name, organization, role, email, phone, notes } = req.body as Record<
      string,
      unknown
    >;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    const stakeholder = await prisma.stakeholder.create({
      data: {
        projectId: req.params.id,
        name: name.trim(),
        organization: (organization as string) || null,
        role: (role as string) || null,
        email: (email as string) || null,
        phone: (phone as string) || null,
        notes: (notes as string) || null,
      },
    });

    await logActivity({
      projectId: project.id,
      projectName: project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: `added stakeholder "${stakeholder.name}"`,
    });

    res.status(201).json(stakeholder);
  }
);

export const stakeholdersRouter = Router();

stakeholdersRouter.put("/:id", async (req, res) => {
  const before = await prisma.stakeholder.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Stakeholder not found" });

  const { name, organization, role, email, phone, notes } = req.body as Record<
    string,
    unknown
  >;

  const data: Record<string, unknown> = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    data.name = name.trim();
  }
  if (organization !== undefined) data.organization = organization || null;
  if (role !== undefined) data.role = role || null;
  if (email !== undefined) data.email = email || null;
  if (phone !== undefined) data.phone = phone || null;
  if (notes !== undefined) data.notes = notes || null;

  try {
    const stakeholder = await prisma.stakeholder.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeStakeholderUpdate(before, data),
    });
    res.json(stakeholder);
  } catch (err) {
    res.status(400).json({ error: "Unable to update stakeholder" });
  }
});

stakeholdersRouter.delete("/:id", async (req, res) => {
  const stakeholder = await prisma.stakeholder.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!stakeholder) return res.status(404).json({ error: "Stakeholder not found" });

  await logActivity({
    projectId: stakeholder.project.id,
    projectName: stakeholder.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `removed stakeholder "${stakeholder.name}"`,
  });
  await prisma.stakeholder.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectStakeholdersRouter;
