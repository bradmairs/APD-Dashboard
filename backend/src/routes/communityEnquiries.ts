import { Request, Response, Router } from "express";
import { EnquiryCategory, EnquiryStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { describeCommunityEnquiryUpdate, logActivity } from "../activityLog";

const CATEGORIES = ["NOISE", "TRAFFIC", "DUST", "ACCESS", "OTHER"];
const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const RESOLVED_IMPLYING_STATUSES = ["RESOLVED", "CLOSED"];

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value as string) : null;
}

function parseRequiredDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const projectCommunityEnquiriesRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectCommunityEnquiriesRouter.get("/", async (req: Request<ProjectParams>, res: Response) => {
  const enquiries = await prisma.communityEnquiry.findMany({
    where: { projectId: req.params.id },
    orderBy: { dateReceived: "desc" },
  });
  res.json(enquiries);
});

projectCommunityEnquiriesRouter.post("/", async (req: Request<ProjectParams>, res: Response) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const {
    reference,
    category,
    source,
    contactName,
    contactDetails,
    description,
    dateReceived,
    status,
    assignedTo,
    resolution,
    notes,
  } = req.body as Record<string, unknown>;

  if (!CATEGORIES.includes(category as string)) {
    return res.status(400).json({ error: "category must be NOISE, TRAFFIC, DUST, ACCESS or OTHER" });
  }
  if (typeof description !== "string" || !description.trim()) {
    return res.status(400).json({ error: "Description is required" });
  }
  const parsedDateReceived = parseRequiredDate(dateReceived);
  if (!parsedDateReceived) {
    return res.status(400).json({ error: "A valid date received is required" });
  }
  if (status !== undefined && !STATUSES.includes(status as string)) {
    return res.status(400).json({ error: "status must be OPEN, IN_PROGRESS, RESOLVED or CLOSED" });
  }

  const resolvedStatus = (status as EnquiryStatus) ?? "OPEN";
  const resolved = RESOLVED_IMPLYING_STATUSES.includes(resolvedStatus);

  const enquiry = await prisma.communityEnquiry.create({
    data: {
      projectId: req.params.id,
      reference: (reference as string) || null,
      category: category as EnquiryCategory,
      source: (source as string) || null,
      contactName: (contactName as string) || null,
      contactDetails: (contactDetails as string) || null,
      description: description.trim(),
      dateReceived: parsedDateReceived,
      status: resolvedStatus,
      assignedTo: (assignedTo as string) || null,
      resolution: (resolution as string) || null,
      dateResolved: resolved ? new Date() : null,
      loggedById: req.user!.sub,
      loggedByName: req.user!.name,
      notes: (notes as string) || null,
    },
  });

  await logActivity({
    projectId: project.id,
    projectName: project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `logged a community enquiry${enquiry.reference ? ` "${enquiry.reference}"` : ""}`,
  });

  res.status(201).json(enquiry);
});

export const communityEnquiriesRouter = Router();

// Every enquiry across every project, for a portfolio-wide Open Enquiries
// panel on the dashboard — avoids one request per project.
communityEnquiriesRouter.get("/", async (_req, res) => {
  const enquiries = await prisma.communityEnquiry.findMany({
    orderBy: { dateReceived: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
  res.json(enquiries);
});

communityEnquiriesRouter.put("/:id", async (req, res) => {
  const before = await prisma.communityEnquiry.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Enquiry not found" });

  const {
    reference,
    category,
    source,
    contactName,
    contactDetails,
    description,
    dateReceived,
    status,
    assignedTo,
    resolution,
    notes,
  } = req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (reference !== undefined) data.reference = reference || null;
  if (category !== undefined) {
    if (!CATEGORIES.includes(category as string)) {
      return res.status(400).json({ error: "category must be NOISE, TRAFFIC, DUST, ACCESS or OTHER" });
    }
    data.category = category;
  }
  if (source !== undefined) data.source = source || null;
  if (contactName !== undefined) data.contactName = contactName || null;
  if (contactDetails !== undefined) data.contactDetails = contactDetails || null;
  if (description !== undefined) {
    if (typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ error: "Description is required" });
    }
    data.description = description.trim();
  }
  const received = parseDate(dateReceived);
  if (received !== undefined) data.dateReceived = received ?? before.dateReceived;
  if (assignedTo !== undefined) data.assignedTo = assignedTo || null;
  if (resolution !== undefined) data.resolution = resolution || null;
  if (notes !== undefined) data.notes = notes || null;
  if (status !== undefined) {
    if (!STATUSES.includes(status as string)) {
      return res.status(400).json({ error: "status must be OPEN, IN_PROGRESS, RESOLVED or CLOSED" });
    }
    data.status = status;
    if (status !== before.status) {
      const resolved = RESOLVED_IMPLYING_STATUSES.includes(status as string);
      data.dateResolved = resolved ? before.dateResolved ?? new Date() : null;
    }
  }

  try {
    const enquiry = await prisma.communityEnquiry.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeCommunityEnquiryUpdate(before, data),
    });
    res.json(enquiry);
  } catch (err) {
    res.status(400).json({ error: "Unable to update enquiry" });
  }
});

communityEnquiriesRouter.delete("/:id", async (req, res) => {
  const enquiry = await prisma.communityEnquiry.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!enquiry) return res.status(404).json({ error: "Enquiry not found" });

  await logActivity({
    projectId: enquiry.project.id,
    projectName: enquiry.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `deleted a community enquiry${enquiry.reference ? ` "${enquiry.reference}"` : ""}`,
  });
  await prisma.communityEnquiry.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectCommunityEnquiriesRouter;
