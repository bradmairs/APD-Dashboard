import { Request, Response, Router } from "express";
import { prisma } from "../prisma";
import { logActivity } from "../activityLog";

function normalizeMonth(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return new Date(Date.UTC(year, month - 1, 1));
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const TYPE_LABELS: Record<string, string> = {
  ACTUAL: "actual",
  FORECAST: "forecast",
};

const projectCashFlowRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectCashFlowRouter.get(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const entries = await prisma.cashFlowEntry.findMany({
      where: { projectId: req.params.id },
      orderBy: { month: "asc" },
    });
    res.json(entries);
  }
);

projectCashFlowRouter.post(
  "/",
  async (req: Request<ProjectParams>, res: Response) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const { month, type, amount } = req.body as Record<string, unknown>;

    const parsedMonth = normalizeMonth(month);
    if (!parsedMonth) {
      return res.status(400).json({ error: "A valid month is required" });
    }
    if (type !== "ACTUAL" && type !== "FORECAST") {
      return res.status(400).json({ error: "type must be ACTUAL or FORECAST" });
    }
    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ error: "A valid non-negative amount is required" });
    }

    const entry = await prisma.cashFlowEntry.upsert({
      where: {
        projectId_month_type: {
          projectId: req.params.id,
          month: parsedMonth,
          type,
        },
      },
      create: {
        projectId: req.params.id,
        month: parsedMonth,
        type,
        amount: parsedAmount,
      },
      update: {
        amount: parsedAmount,
      },
    });

    await logActivity({
      projectId: project.id,
      projectName: project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: `recorded ${formatMonth(parsedMonth)} ${TYPE_LABELS[type]} spend`,
    });

    res.status(200).json(entry);
  }
);

export const cashFlowRouter = Router();

// Every cash flow entry across every project, for the portfolio-wide
// dashboard chart — avoids the frontend fanning out one request per project.
cashFlowRouter.get("/", async (_req, res) => {
  const entries = await prisma.cashFlowEntry.findMany({
    orderBy: { month: "asc" },
  });
  res.json(entries);
});

// Edit an existing entry's amount and/or flip it between forecast and actual
// (the usual case: a month's forecast becomes an actual once the spend is
// known). If the target type already exists for that month the two merge: the
// existing entry takes the new amount and this one is removed, because
// (project, month, type) is unique.
cashFlowRouter.put("/:id", async (req, res) => {
  const entry = await prisma.cashFlowEntry.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!entry) return res.status(404).json({ error: "Cash flow entry not found" });

  const { type, amount } = req.body as Record<string, unknown>;
  if (type === undefined && amount === undefined) {
    return res.status(400).json({ error: "Nothing to update" });
  }
  if (type !== undefined && type !== "ACTUAL" && type !== "FORECAST") {
    return res.status(400).json({ error: "type must be ACTUAL or FORECAST" });
  }
  let newAmount: number | undefined;
  if (amount !== undefined) {
    newAmount = amount === "" || amount === null ? NaN : Number(amount);
    if (Number.isNaN(newAmount) || newAmount < 0) {
      return res.status(400).json({ error: "A valid non-negative amount is required" });
    }
  }

  const targetType = (type as "ACTUAL" | "FORECAST" | undefined) ?? entry.type;
  const finalAmount = newAmount ?? entry.amount;

  const result = await prisma.$transaction(async (tx) => {
    if (targetType !== entry.type) {
      const existing = await tx.cashFlowEntry.findUnique({
        where: {
          projectId_month_type: {
            projectId: entry.projectId,
            month: entry.month,
            type: targetType,
          },
        },
      });
      if (existing) {
        const merged = await tx.cashFlowEntry.update({
          where: { id: existing.id },
          data: { amount: finalAmount },
        });
        await tx.cashFlowEntry.delete({ where: { id: entry.id } });
        return { entry: merged, merged: true };
      }
    }
    const updated = await tx.cashFlowEntry.update({
      where: { id: entry.id },
      data: { type: targetType, amount: finalAmount },
    });
    return { entry: updated, merged: false };
  });

  const month = formatMonth(entry.month);
  const action =
    targetType !== entry.type
      ? `changed the ${month} ${TYPE_LABELS[entry.type]} entry to ${TYPE_LABELS[targetType]}${
          result.merged ? ` (replacing the existing ${TYPE_LABELS[targetType]} entry)` : ""
        }`
      : `updated the ${month} ${TYPE_LABELS[entry.type]} spend`;
  await logActivity({
    projectId: entry.project.id,
    projectName: entry.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action,
  });

  res.json(result.entry);
});

cashFlowRouter.delete("/:id", async (req, res) => {
  const entry = await prisma.cashFlowEntry.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!entry) return res.status(404).json({ error: "Cash flow entry not found" });

  await logActivity({
    projectId: entry.project.id,
    projectName: entry.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: `removed the ${formatMonth(entry.month)} ${TYPE_LABELS[entry.type]} entry`,
  });
  await prisma.cashFlowEntry.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectCashFlowRouter;
