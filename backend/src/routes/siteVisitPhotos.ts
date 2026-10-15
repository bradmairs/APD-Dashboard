import fs from "fs";
import { NextFunction, Request, Response, Router } from "express";
import { prisma } from "../prisma";
import { extractPhotoMetadata } from "../exif";
import { photoUpload, siteVisitPhotoFilePath } from "../upload";
import { logActivity } from "../activityLog";
import { ArchiveError, isArchiveConfigured, pushSiteVisitPhotoToArchive } from "../engineeringArchive";
import type { SiteVisitPhoto } from "@prisma/client";

type SiteVisitParams = { id: string };

// Looks up the target site visit once per request and stashes what the
// disk-storage destination needs (it only receives req/file, never res) —
// mirrors the pattern used for project attachments in routes/projects.ts.
async function loadSiteVisit(
  req: Request<SiteVisitParams>,
  res: Response,
  next: NextFunction
) {
  const siteVisit = await prisma.siteVisit.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!siteVisit) return res.status(404).json({ error: "Site visit not found" });
  req.photoUploadContext = { projectId: siteVisit.projectId, siteVisitId: siteVisit.id };
  res.locals.siteVisit = siteVisit;
  next();
}

// Best-effort export to the Engineering Archive — deliberately not awaited
// by the upload route, so a slow or unreachable Archive never delays the
// user's own upload response. Failure is recorded on the photo row (visible
// in the UI, retriable via POST /:id/sync-to-archive) rather than thrown
// anywhere, since nothing here is on the critical path of the request that
// triggered it.
async function syncPhotoToArchive(
  photo: SiteVisitPhoto,
  project: { id: string; name: string }
) {
  if (!isArchiveConfigured()) return;
  try {
    const result = await pushSiteVisitPhotoToArchive({
      photoId: photo.id,
      projectId: project.id,
      projectName: project.name,
      siteVisitId: photo.siteVisitId,
      storedFilename: photo.storedFilename,
      originalName: photo.originalName,
      mimeType: photo.mimeType,
      latitude: photo.latitude,
      longitude: photo.longitude,
      takenAt: photo.takenAt,
    });
    await prisma.siteVisitPhoto.update({
      where: { id: photo.id },
      data: { archiveMediaId: result.id, archiveSyncedAt: new Date(), archiveSyncError: null },
    });
  } catch (err) {
    const message = err instanceof ArchiveError ? err.message : "Failed to export to the Archive";
    await prisma.siteVisitPhoto
      .update({ where: { id: photo.id }, data: { archiveSyncError: message } })
      .catch(() => undefined); // the photo itself may have been deleted meanwhile
  }
}

const projectSiteVisitPhotosRouter = Router({ mergeParams: true });

projectSiteVisitPhotosRouter.get(
  "/",
  async (req: Request<SiteVisitParams>, res: Response) => {
    const photos = await prisma.siteVisitPhoto.findMany({
      where: { siteVisitId: req.params.id },
      orderBy: { createdAt: "asc" },
    });
    res.json(photos);
  }
);

projectSiteVisitPhotosRouter.post(
  "/",
  loadSiteVisit,
  photoUpload.array("photos", 10),
  async (req: Request<SiteVisitParams>, res: Response) => {
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) {
      return res.status(400).json({ error: "No photos uploaded" });
    }
    const siteVisit = res.locals.siteVisit as { id: string; project: { id: string; name: string } };

    const photos = await Promise.all(
      files.map(async (file) => {
        const metadata = await extractPhotoMetadata(
          siteVisitPhotoFilePath(siteVisit.project.id, siteVisit.id, file.filename)
        );
        return prisma.siteVisitPhoto.create({
          data: {
            siteVisitId: siteVisit.id,
            storedFilename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            latitude: metadata.latitude,
            longitude: metadata.longitude,
            takenAt: metadata.takenAt,
            uploadedById: req.user!.sub,
            uploadedByName: req.user!.name,
          },
        });
      })
    );

    const geotagged = photos.filter((p) => p.latitude !== null).length;
    await logActivity({
      projectId: siteVisit.project.id,
      projectName: siteVisit.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action:
        photos.length === 1
          ? `added a photo to the site visit${geotagged ? " (geotagged)" : ""}`
          : `added ${photos.length} photos to the site visit (${geotagged} geotagged)`,
    });

    res.status(201).json(photos);

    photos.forEach((photo) => {
      syncPhotoToArchive(photo, siteVisit.project);
    });
  }
);

export const siteVisitPhotosRouter = Router();

siteVisitPhotosRouter.post("/:id/sync-to-archive", async (req, res) => {
  const photo = await prisma.siteVisitPhoto.findUnique({
    where: { id: req.params.id },
    include: { siteVisit: { include: { project: { select: { id: true, name: true } } } } },
  });
  if (!photo) return res.status(404).json({ error: "Photo not found" });
  if (!isArchiveConfigured()) {
    return res.status(503).json({ error: "Engineering Archive integration is not configured" });
  }

  await syncPhotoToArchive(photo, photo.siteVisit.project);
  const updated = await prisma.siteVisitPhoto.findUnique({ where: { id: req.params.id } });
  res.json(updated);
});

siteVisitPhotosRouter.get("/:id/file", async (req, res) => {
  const photo = await prisma.siteVisitPhoto.findUnique({
    where: { id: req.params.id },
    include: { siteVisit: { select: { projectId: true } } },
  });
  if (!photo) return res.status(404).json({ error: "Photo not found" });

  const filePath = siteVisitPhotoFilePath(
    photo.siteVisit.projectId,
    photo.siteVisitId,
    photo.storedFilename
  );
  res.type(photo.mimeType);
  res.sendFile(filePath, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: "File not found on disk" });
    }
  });
});

siteVisitPhotosRouter.delete("/:id", async (req, res) => {
  const photo = await prisma.siteVisitPhoto.findUnique({
    where: { id: req.params.id },
    include: {
      siteVisit: { include: { project: { select: { id: true, name: true } } } },
    },
  });
  if (!photo) return res.status(404).json({ error: "Photo not found" });

  await prisma.siteVisitPhoto.delete({ where: { id: req.params.id } });

  const filePath = siteVisitPhotoFilePath(
    photo.siteVisit.projectId,
    photo.siteVisitId,
    photo.storedFilename
  );
  fs.unlink(filePath, () => {});

  await logActivity({
    projectId: photo.siteVisit.project.id,
    projectName: photo.siteVisit.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: "deleted a site visit photo",
  });

  res.status(204).send();
});

// Every geotagged-or-not photo across a project's site visits, with just
// enough of the parent visit's data for a map popup or thumbnail caption —
// avoids the frontend having to fan out one request per site visit.
export const projectSitePhotosRouter = Router();

type ProjectParams = { id: string };

projectSitePhotosRouter.get("/", async (req: Request<ProjectParams>, res: Response) => {
  const photos = await prisma.siteVisitPhoto.findMany({
    where: { siteVisit: { projectId: req.params.id } },
    orderBy: { createdAt: "asc" },
    include: { siteVisit: { select: { id: true, location: true, visitDate: true } } },
  });
  res.json(photos);
});

export default projectSiteVisitPhotosRouter;
