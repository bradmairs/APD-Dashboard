import express, { ErrorRequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import multer from "multer";
import cron from "node-cron";
import { sendDigestEmails } from "./digest";
import authRouter from "./routes/auth";
import projectsRouter from "./routes/projects";
import { tasksRouter } from "./routes/tasks";
import { reportsRouter } from "./routes/monthlyReports";
import { milestonesRouter } from "./routes/milestones";
import { cashFlowRouter } from "./routes/cashFlow";
import { siteVisitsRouter } from "./routes/siteVisits";
import { siteVisitPhotosRouter } from "./routes/siteVisitPhotos";
import { variationsRouter } from "./routes/variations";
import { risksRouter } from "./routes/risks";
import { actionItemsRouter } from "./routes/actionItems";
import { stakeholdersRouter } from "./routes/stakeholders";
import { permitsRouter } from "./routes/permits";
import { lessonsLearnedRouter } from "./routes/lessonsLearned";
import { sqeRouter } from "./routes/sqe";
import { eotClaimsRouter } from "./routes/eotClaims";
import { delaysRouter } from "./routes/delays";
import { checklistItemsRouter } from "./routes/checklistItems";
import { defectsRouter } from "./routes/defects";
import { paymentClaimsRouter } from "./routes/paymentClaims";
import { insuranceWarrantiesRouter } from "./routes/insuranceWarranties";
import { rfisRouter } from "./routes/rfis";
import { documentsRouter } from "./routes/documents";
import { communityEnquiriesRouter } from "./routes/communityEnquiries";
import { subcontractorsRouter } from "./routes/subcontractors";
import { contractsRouter } from "./routes/contracts";
import { meetingMinutesRouter } from "./routes/meetingMinutes";
import { correspondenceRouter } from "./routes/correspondence";
import { trainingRecordsRouter } from "./routes/trainingRecords";
import { performanceReviewsRouter } from "./routes/performanceReviews";
import { toolboxTalksRouter } from "./routes/toolboxTalks";
import { environmentalMonitoringRouter } from "./routes/environmentalMonitoring";
import { safetyInspectionsRouter } from "./routes/safetyInspections";
import { tenderPackagesRouter } from "./routes/tenderPackages";
import { searchRouter } from "./routes/search";
import { aiRouter } from "./routes/ai";
import { archiveLinksRouter, archiveSearchRouter } from "./routes/archiveLinks";
import activityRouter from "./routes/activity";
import attachmentsRouter from "./routes/attachments";
import usersRouter from "./routes/users";
import taskTemplatesRouter from "./routes/taskTemplates";
import toolSuggestionsRouter from "./routes/toolSuggestions";
import userOptionsRouter from "./routes/userOptions";
import { requireAuth } from "./middleware/requireAuth";
import { requireAdmin } from "./middleware/requireAdmin";
import { blockViewerMutations } from "./middleware/blockViewerMutations";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

// The only way this process ever receives a request is via the frontend
// container's nginx (see frontend/nginx.conf), which sits directly in
// front of it on the Docker network — so there's exactly one hop to
// trust. This makes req.ip (and the login rate limiter, which keys on
// it) read the real client IP from X-Forwarded-For instead of treating
// every request as coming from that one proxy. If you put another
// reverse proxy in front of the frontend container (e.g. a corporate
// load balancer), make sure it forwards/appends X-Forwarded-For too —
// nginx.conf already chains onto whatever it receives.
app.set("trust proxy", 1);

// Baseline HTTP security headers (HSTS, X-Content-Type-Options,
// X-Frame-Options, a default CSP, etc.) — cheap defense in depth for a
// JSON API, and matters more once this is reachable from the open
// internet rather than just a trusted LAN.
app.use(helmet());

// The SPA never actually makes a cross-origin request to this API: in
// both local dev (Vite's proxy, vite.config.ts) and the shipped
// container (frontend/nginx.conf's /api/ proxy), the browser always
// talks to this backend through the same origin it loaded the page
// from. So nothing legitimate needs CORS at all, and the safe default is
// to disable cross-origin access entirely unless FRONTEND_URL is set —
// e.g. for a separately-hosted frontend, or testing against this API
// from another origin.
const corsOrigin = process.env.FRONTEND_URL || false;
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// The Viewer role gets full read access but no create/update/delete anywhere
// in the main app — enforced here in one place rather than in each of the
// several dozen register routers below. AI (query, not mutation) is
// intentionally left off this list.
const readOnlyGuarded = [requireAuth, blockViewerMutations];

app.use("/api/auth", authRouter);
app.use("/api/projects", readOnlyGuarded, projectsRouter);
app.use("/api/tasks", readOnlyGuarded, tasksRouter);
app.use("/api/reports", readOnlyGuarded, reportsRouter);
app.use("/api/milestones", readOnlyGuarded, milestonesRouter);
app.use("/api/cashflow", readOnlyGuarded, cashFlowRouter);
app.use("/api/site-visits", readOnlyGuarded, siteVisitsRouter);
app.use("/api/site-visit-photos", readOnlyGuarded, siteVisitPhotosRouter);
app.use("/api/variations", readOnlyGuarded, variationsRouter);
app.use("/api/risks", readOnlyGuarded, risksRouter);
app.use("/api/action-items", readOnlyGuarded, actionItemsRouter);
app.use("/api/stakeholders", readOnlyGuarded, stakeholdersRouter);
app.use("/api/permits", readOnlyGuarded, permitsRouter);
app.use("/api/lessons-learned", readOnlyGuarded, lessonsLearnedRouter);
app.use("/api/sqe", readOnlyGuarded, sqeRouter);
app.use("/api/eot-claims", readOnlyGuarded, eotClaimsRouter);
app.use("/api/delays", readOnlyGuarded, delaysRouter);
app.use("/api/checklist-items", readOnlyGuarded, checklistItemsRouter);
app.use("/api/defects", readOnlyGuarded, defectsRouter);
app.use("/api/payment-claims", readOnlyGuarded, paymentClaimsRouter);
app.use("/api/insurance-warranties", readOnlyGuarded, insuranceWarrantiesRouter);
app.use("/api/rfis", readOnlyGuarded, rfisRouter);
app.use("/api/documents", readOnlyGuarded, documentsRouter);
app.use("/api/community-enquiries", readOnlyGuarded, communityEnquiriesRouter);
app.use("/api/subcontractors", readOnlyGuarded, subcontractorsRouter);
app.use("/api/contracts", readOnlyGuarded, contractsRouter);
app.use("/api/meeting-minutes", readOnlyGuarded, meetingMinutesRouter);
app.use("/api/correspondence", readOnlyGuarded, correspondenceRouter);
app.use("/api/training-records", readOnlyGuarded, trainingRecordsRouter);
app.use("/api/performance-reviews", readOnlyGuarded, performanceReviewsRouter);
app.use("/api/toolbox-talks", readOnlyGuarded, toolboxTalksRouter);
app.use("/api/environmental-monitoring", readOnlyGuarded, environmentalMonitoringRouter);
app.use("/api/safety-inspections", readOnlyGuarded, safetyInspectionsRouter);
app.use("/api/tender-packages", readOnlyGuarded, tenderPackagesRouter);
app.use("/api/search", requireAuth, searchRouter);
app.use("/api/ai", requireAuth, aiRouter);
app.use("/api/archive-links", readOnlyGuarded, archiveLinksRouter);
app.use("/api/archive-search", requireAuth, archiveSearchRouter);
app.use("/api/activity", requireAuth, activityRouter);
app.use("/api/attachments", readOnlyGuarded, attachmentsRouter);
app.use("/api/users", requireAuth, requireAdmin, usersRouter);
app.use("/api/task-templates", readOnlyGuarded, taskTemplatesRouter);
// Deliberately not readOnlyGuarded: Viewers can make suggestions too (see
// routes/toolSuggestions.ts for who can edit what).
app.use("/api/tool-suggestions", requireAuth, toolSuggestionsRouter);
app.use("/api/user-options", requireAuth, userOptionsRouter);

// Catches multer's file-size/file-type rejections (thrown before any route
// handler runs) and reports them as clean JSON instead of Express's default
// HTML error page. Also the app-wide fallback for anything else thrown or
// passed to next(err) — those messages (Prisma errors, programming bugs,
// ...) are never safe to hand straight to the client, so only multer's own
// deliberately user-facing messages are ever echoed back; everything else
// is logged here and reported generically.
const handleUploadErrors: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
};
app.use(handleUploadErrors);

app.listen(port, () => {
  console.log(`APD dashboard API listening on port ${port}`);
});

// Fires every day at the configured time (server-local time zone, default
// 7am) and no-ops unless SMTP_HOST is set — see digest.ts. A bad
// DIGEST_CRON value would otherwise throw at startup and take the whole
// API down with it, so it's validated first and only the default is used
// on an invalid override.
const digestCron = process.env.DIGEST_CRON || "0 7 * * *";
if (cron.validate(digestCron)) {
  cron.schedule(digestCron, () => {
    sendDigestEmails().catch((err) => console.error("Digest email run failed:", err));
  });
} else {
  console.error(`Invalid DIGEST_CRON "${digestCron}" — email digest scheduling disabled.`);
}
