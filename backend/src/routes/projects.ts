import fs from "fs";
import { Router } from "express";
import { prisma } from "../prisma";
import projectTasksRouter from "./tasks";
import projectReportsRouter from "./monthlyReports";
import projectMilestonesRouter from "./milestones";
import projectCashFlowRouter from "./cashFlow";
import projectSiteVisitsRouter from "./siteVisits";
import { projectSitePhotosRouter } from "./siteVisitPhotos";
import projectVariationsRouter from "./variations";
import projectRisksRouter from "./risks";
import projectActionItemsRouter from "./actionItems";
import projectStakeholdersRouter from "./stakeholders";
import projectPermitsRouter from "./permits";
import projectLessonsLearnedRouter from "./lessonsLearned";
import projectSqeRouter from "./sqe";
import projectEotClaimsRouter from "./eotClaims";
import projectDelaysRouter from "./delays";
import projectChecklistItemsRouter from "./checklistItems";
import projectDefectsRouter from "./defects";
import projectPaymentClaimsRouter from "./paymentClaims";
import projectInsuranceWarrantiesRouter from "./insuranceWarranties";
import projectRfisRouter from "./rfis";
import projectDocumentsRouter from "./documents";
import projectCommunityEnquiriesRouter from "./communityEnquiries";
import projectSubcontractorsRouter from "./subcontractors";
import projectContractsRouter from "./contracts";
import projectMeetingMinutesRouter from "./meetingMinutes";
import projectCorrespondenceRouter from "./correspondence";
import projectTrainingRecordsRouter from "./trainingRecords";
import projectPerformanceReviewsRouter from "./performanceReviews";
import projectToolboxTalksRouter from "./toolboxTalks";
import projectEnvironmentalMonitoringRouter from "./environmentalMonitoring";
import projectSafetyInspectionsRouter from "./safetyInspections";
import projectTenderPackagesRouter from "./tenderPackages";
import projectAiRouter from "./ai";
import projectArchiveLinksRouter from "./archiveLinks";
import { describeProjectChanges, logActivity } from "../activityLog";
import { projectUploadDir, upload } from "../upload";
import { canModifyProject } from "../permissions";

const router = Router();

// The project manager is picked from the user list (projectManagerId) rather
// than typed, so notifications can reliably tell whose project it is. The
// stored projectManager name is always derived from that user here, never
// taken from the client, so the two can't drift apart. Only touches the body
// when projectManagerId was actually sent, so older clients and CSV-style
// updates that only send other fields leave the manager alone.
async function resolveProjectManager(
  data: Record<string, unknown>
): Promise<string | null> {
  if (!("projectManagerId" in data)) {
    delete data.projectManager;
    return null;
  }
  const id = data.projectManagerId;
  if (id === null || id === "") {
    data.projectManagerId = null;
    data.projectManager = null;
    return null;
  }
  if (typeof id !== "string") return "Invalid project manager";
  const manager = await prisma.user.findUnique({
    where: { id },
    select: { name: true, active: true },
  });
  if (!manager || !manager.active) return "Project manager must be an active user";
  data.projectManager = manager.name;
  return null;
}

router.use("/:projectId/tasks", projectTasksRouter);
router.use("/:id/reports", projectReportsRouter);
router.use("/:id/milestones", projectMilestonesRouter);
router.use("/:id/cashflow", projectCashFlowRouter);
router.use("/:id/site-visits", projectSiteVisitsRouter);
router.use("/:id/site-visit-photos", projectSitePhotosRouter);
router.use("/:id/variations", projectVariationsRouter);
router.use("/:id/risks", projectRisksRouter);
router.use("/:id/action-items", projectActionItemsRouter);
router.use("/:id/stakeholders", projectStakeholdersRouter);
router.use("/:id/permits", projectPermitsRouter);
router.use("/:id/lessons-learned", projectLessonsLearnedRouter);
router.use("/:id/sqe", projectSqeRouter);
router.use("/:id/eot-claims", projectEotClaimsRouter);
router.use("/:id/delays", projectDelaysRouter);
router.use("/:id/checklist-items", projectChecklistItemsRouter);
router.use("/:id/defects", projectDefectsRouter);
router.use("/:id/payment-claims", projectPaymentClaimsRouter);
router.use("/:id/insurance-warranties", projectInsuranceWarrantiesRouter);
router.use("/:id/rfis", projectRfisRouter);
router.use("/:id/documents", projectDocumentsRouter);
router.use("/:id/community-enquiries", projectCommunityEnquiriesRouter);
router.use("/:id/subcontractors", projectSubcontractorsRouter);
router.use("/:id/contracts", projectContractsRouter);
router.use("/:id/meeting-minutes", projectMeetingMinutesRouter);
router.use("/:id/correspondence", projectCorrespondenceRouter);
router.use("/:id/training-records", projectTrainingRecordsRouter);
router.use("/:id/performance-reviews", projectPerformanceReviewsRouter);
router.use("/:id/toolbox-talks", projectToolboxTalksRouter);
router.use("/:id/environmental-monitoring", projectEnvironmentalMonitoringRouter);
router.use("/:id/safety-inspections", projectSafetyInspectionsRouter);
router.use("/:id/tender-packages", projectTenderPackagesRouter);
router.use("/:id/ai", projectAiRouter);
router.use("/:id/archive-links", projectArchiveLinksRouter);

router.get("/", async (_req, res) => {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      tasks: { select: { id: true, status: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  res.json(projects);
});

router.get("/:id", async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      tasks: { orderBy: [{ status: "asc" }, { dueDate: "asc" }] },
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(project);
});

router.get("/:id/activity", async (req, res) => {
  const entries = await prisma.activityLog.findMany({
    where: { projectId: req.params.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(entries);
});

router.get("/:id/attachments", async (req, res) => {
  const attachments = await prisma.attachment.findMany({
    where: { projectId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(attachments);
});

router.post(
  "/:id/attachments",
  async (req, res, next) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.locals.projectName = project.name;
    next();
  },
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const meetingMinutesId =
      typeof req.body.meetingMinutesId === "string" && req.body.meetingMinutesId
        ? req.body.meetingMinutesId
        : null;

    const attachment = await prisma.attachment.create({
      data: {
        projectId: req.params.id,
        storedFilename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        meetingMinutesId,
        uploadedById: req.user!.sub,
        uploadedByName: req.user!.name,
      },
    });

    await logActivity({
      projectId: req.params.id,
      projectName: res.locals.projectName,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: `uploaded file "${attachment.originalName}"`,
    });

    res.status(201).json(attachment);
  }
);

router.post("/", async (req, res) => {
  try {
    // createdById is server-assigned, never taken from the request body —
    // otherwise a client could claim a project was created by someone else.
    const { createdById, ...data } = req.body;
    const managerError = await resolveProjectManager(data);
    if (managerError) return res.status(400).json({ error: managerError });
    const project = await prisma.project.create({
      data: { ...data, createdById: req.user!.sub },
    });
    await logActivity({
      projectId: project.id,
      projectName: project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: "created the project",
    });
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: "Invalid project data" });
  }
});

router.put("/:id", async (req, res) => {
  const before = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!before) return res.status(404).json({ error: "Project not found" });
  if (!canModifyProject(before, req.user!)) {
    return res
      .status(403)
      .json({ error: "Only the project's creator or an admin can edit it" });
  }

  try {
    // createdById can't be reassigned through an edit.
    const { createdById, ...data } = req.body;
    const managerError = await resolveProjectManager(data);
    if (managerError) return res.status(400).json({ error: managerError });
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: project.id,
      projectName: project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeProjectChanges(before, data),
    });
    res.json(project);
  } catch (err) {
    res.status(400).json({ error: "Unable to update project" });
  }
});

router.delete("/:id", async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (!canModifyProject(project, req.user!)) {
    return res
      .status(403)
      .json({ error: "Only the project's creator or an admin can delete it" });
  }

  await logActivity({
    projectId: project.id,
    projectName: project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: "deleted the project",
  });
  await prisma.project.delete({ where: { id: req.params.id } });

  // Attachment rows cascade-deleted above; the files on disk don't, so
  // remove the whole per-project upload directory now.
  fs.rm(projectUploadDir(req.params.id), { recursive: true, force: true }, () => {});

  res.status(204).send();
});

export default router;
