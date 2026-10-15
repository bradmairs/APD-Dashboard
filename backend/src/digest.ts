import nodemailer from "nodemailer";
import { prisma } from "./prisma";

const TASK_RFI_WINDOW_DAYS = 7;
const EXPIRY_WINDOW_DAYS = 60;

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

interface DigestItem {
  kind: "Task" | "Permit" | "Insurance" | "Warranty" | "RFI";
  title: string;
  date: Date;
  overdue: boolean;
  // Null for a portfolio-wide task, which has no project to link to.
  projectName: string;
  projectId: string | null;
}

// Mirrors the thresholds and overdue/due-soon logic the frontend's
// NotificationBell already uses (frontend/src/taskMeta.ts, permitMeta.ts,
// insuranceWarrantyMeta.ts, rfiMeta.ts) — kept as a separate server-side
// copy rather than a shared package since the two apps aren't set up to
// share code, but the thresholds (7 days for tasks/RFIs, 60 for permits/
// insurance-warranties) and "only count what's still open" rules are
// deliberately identical so the digest never disagrees with what a user
// sees in-app.
export async function buildDigestItems(): Promise<DigestItem[]> {
  const now = new Date();
  const taskCutoff = daysFromNow(TASK_RFI_WINDOW_DAYS);
  const expiryCutoff = daysFromNow(EXPIRY_WINDOW_DAYS);

  const [tasks, permits, insuranceWarranties, rfis] = await Promise.all([
    prisma.task.findMany({
      where: { status: { not: "DONE" }, dueDate: { lte: taskCutoff } },
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.permit.findMany({
      where: { status: "APPROVED", expiryDate: { lte: expiryCutoff } },
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.insuranceWarranty.findMany({
      where: { expiryDate: { lte: expiryCutoff } },
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.rfi.findMany({
      where: { status: "OPEN", dateRequired: { lte: taskCutoff } },
      include: { project: { select: { id: true, name: true } } },
    }),
  ]);

  const items: DigestItem[] = [];

  for (const t of tasks) {
    if (!t.dueDate) continue;
    items.push({
      kind: "Task",
      title: t.title,
      date: t.dueDate,
      overdue: t.dueDate < now,
      projectName: t.project?.name ?? "Portfolio",
      projectId: t.project?.id ?? null,
    });
  }
  for (const p of permits) {
    if (!p.expiryDate) continue;
    items.push({
      kind: "Permit",
      title: p.title,
      date: p.expiryDate,
      overdue: p.expiryDate < now,
      projectName: p.project.name,
      projectId: p.project.id,
    });
  }
  for (const i of insuranceWarranties) {
    if (!i.expiryDate) continue;
    items.push({
      kind: i.type === "WARRANTY" ? "Warranty" : "Insurance",
      title: i.title,
      date: i.expiryDate,
      overdue: i.expiryDate < now,
      projectName: i.project.name,
      projectId: i.project.id,
    });
  }
  for (const r of rfis) {
    if (!r.dateRequired) continue;
    items.push({
      kind: "RFI",
      title: `${r.rfiNumber}: ${r.subject}`,
      date: r.dateRequired,
      overdue: r.dateRequired < now,
      projectName: r.project.name,
      projectId: r.project.id,
    });
  }

  return items.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function renderDigestHtml(items: DigestItem[], baseUrl: string | null): string {
  const rows = items
    .map((item) => {
      const dateLabel = item.date.toISOString().substring(0, 10);
      const projectLabel =
        baseUrl && item.projectId
          ? `<a href="${baseUrl.replace(/\/$/, "")}/projects/${item.projectId}">${escapeHtml(item.projectName)}</a>`
          : escapeHtml(item.projectName);
      return `<tr>
        <td style="padding:4px 8px;color:#64748b;font-size:12px;">${item.kind}</td>
        <td style="padding:4px 8px;">${escapeHtml(item.title)}</td>
        <td style="padding:4px 8px;">${projectLabel}</td>
        <td style="padding:4px 8px;${item.overdue ? "color:#dc2626;font-weight:600;" : ""}">${dateLabel}${item.overdue ? " (overdue)" : ""}</td>
      </tr>`;
    })
    .join("\n");

  return `<div style="font-family:sans-serif;font-size:14px;color:#0f172a;">
    <h2 style="font-size:16px;">Project Management Dashboard — Daily Digest</h2>
    <p>Items overdue or due soon across all projects:</p>
    <table style="border-collapse:collapse;width:100%;">
      <thead>
        <tr style="text-align:left;border-bottom:1px solid #e2e8f0;">
          <th style="padding:4px 8px;">Type</th>
          <th style="padding:4px 8px;">Item</th>
          <th style="padding:4px 8px;">Project</th>
          <th style="padding:4px 8px;">Due</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function renderDigestText(items: DigestItem[]): string {
  const lines = items.map(
    (item) =>
      `- [${item.kind}] ${item.title} (${item.projectName}) — due ${item.date.toISOString().substring(0, 10)}${item.overdue ? " (overdue)" : ""}`
  );
  return `Project Management Dashboard — Daily Digest\n\n${lines.join("\n")}`;
}

function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT ? Number(SMTP_PORT) : 587,
    secure: SMTP_PORT === "465",
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
}

// The whole feature is opt-in at two levels: it does nothing unless SMTP_HOST
// is configured (matching the Ollama/Engineering-Archive pattern of "unset
// env vars = integration disabled"), and even then only reaches users who've
// flipped their own emailDigestOptIn on. Never throws — a misconfigured SMTP
// server or transient send failure is logged, not allowed to crash whatever
// triggered it (a cron tick).
export async function sendDigestEmails(): Promise<void> {
  const transport = getTransport();
  if (!transport) return;

  const items = await buildDigestItems();
  if (items.length === 0) return;

  const recipients = await prisma.user.findMany({
    where: { active: true, emailDigestOptIn: true },
    select: { email: true },
  });
  if (recipients.length === 0) return;

  const baseUrl = process.env.PUBLIC_APP_URL || null;
  const html = renderDigestHtml(items, baseUrl);
  const text = renderDigestText(items);
  const from = process.env.SMTP_FROM || "Project Management Dashboard <no-reply@apd-dashboard.local>";
  const subject = `Project Management Dashboard: ${items.length} item${items.length === 1 ? " needs" : "s need"} attention`;

  for (const { email } of recipients) {
    try {
      await transport.sendMail({ from, to: email, subject, text, html });
    } catch (err) {
      console.error(`Failed to send digest email to ${email}:`, err);
    }
  }
}
