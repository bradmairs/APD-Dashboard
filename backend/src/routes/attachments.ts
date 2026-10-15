import fs from "fs";
import { Router } from "express";
import { prisma } from "../prisma";
import { attachmentFilePath } from "../upload";
import { logActivity } from "../activityLog";

const router = Router();

router.get("/:id/download", async (req, res) => {
  const attachment = await prisma.attachment.findUnique({ where: { id: req.params.id } });
  if (!attachment) return res.status(404).json({ error: "Attachment not found" });

  const filePath = attachmentFilePath(attachment.projectId, attachment.storedFilename);
  res.download(filePath, attachment.originalName, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: "File not found on disk" });
    }
  });
});

router.delete("/:id", async (req, res) => {
  const attachment = await prisma.attachment.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!attachment) return res.status(404).json({ error: "Attachment not found" });

  await prisma.attachment.delete({ where: { id: req.params.id } });

  const filePath = attachmentFilePath(attachment.projectId, attachment.storedFilename);
  fs.unlink(filePath, () => {});

  await logActivity({
    projectId: attachment.project.id,
    projectName: attachment.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted file "${attachment.originalName}"`,
  });

  res.status(204).send();
});

export default router;
