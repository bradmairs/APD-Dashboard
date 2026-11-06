import mammoth from "mammoth";
import { prisma } from "./prisma";
import { logActivity } from "./activityLog";
import { extractActionRows, isClosedStatus, ownerMatches, parseDueDate } from "./minutesActions";

// Importing the project manager's actions from a Word minutes document is
// two steps, so the PM confirms before anything is added:
//   1. preview — when the .docx is attached to a meeting, read its action
//      table and list the PM's actions (see minutesActions.ts);
//   2. add — the actions the PM ticked are created, linked to the meeting.

export interface ActionCandidate {
  action: string;
  // The owner as written in the minutes, e.g. "Brad Mairs / Lachlan McGregor".
  ownerInMinutes: string;
  dueText: string;
  dueDate: string | null;
  // "new" can be added; "duplicate" is already on the project; "closed" is
  // marked done in the minutes. Only "new" ones are ticked by default.
  state: "new" | "duplicate" | "closed";
}

export interface ActionImportPreview {
  // The project manager the owners were matched against, or null when the
  // project has none set.
  manager: string | null;
  fileName: string;
  // Rows found in the document's action table(s).
  found: number;
  candidates: ActionCandidate[];
  // Rows assigned only to other people (not offered).
  skippedOthers: number;
}

const MAX_TITLE = 200;

function normTitle(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function oneLine(text: string): string {
  return text.replace(/\s*\n\s*/g, " ").trim();
}

async function existingActionTexts(projectId: string): Promise<Set<string>> {
  const actions = await prisma.actionItem.findMany({
    where: { projectId },
    select: { title: true, description: true },
  });
  return new Set(
    actions.flatMap((a) => [normTitle(a.title), ...(a.description ? [normTitle(a.description)] : [])])
  );
}

async function managerOf(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      projectManager: true,
      projectManagerUser: { select: { name: true } },
    },
  });
  if (!project) return null;
  const names = [project.projectManager, project.projectManagerUser?.name].filter(
    (n): n is string => !!n
  );
  return { project, names, manager: names[0] ?? null };
}

// Step 1: the project manager's actions in the document, nothing created.
export async function previewMinutesActions(input: {
  projectId: string;
  filePath: string;
  fileName: string;
}): Promise<ActionImportPreview> {
  const pm = await managerOf(input.projectId);
  const preview: ActionImportPreview = {
    manager: pm?.manager ?? null,
    fileName: input.fileName,
    found: 0,
    candidates: [],
    skippedOthers: 0,
  };
  if (!pm) return preview;

  const { value: html } = await mammoth.convertToHtml({ path: input.filePath });
  const rows = extractActionRows(html);
  preview.found = rows.length;
  if (!pm.manager || rows.length === 0) return preview;

  const allOwners = rows.map((r) => r.owner);
  const existing = await existingActionTexts(pm.project.id);
  for (const row of rows) {
    if (!ownerMatches(row.owner, pm.names, allOwners)) {
      preview.skippedOthers++;
      continue;
    }
    const text = oneLine(row.action);
    const due = parseDueDate(row.due);
    preview.candidates.push({
      action: text,
      ownerInMinutes: row.owner,
      dueText: row.due,
      dueDate: due ? due.toISOString() : null,
      state: isClosedStatus(row.status) ? "closed" : existing.has(normTitle(text)) ? "duplicate" : "new",
    });
  }
  return preview;
}

// Step 2: add the actions the project manager ticked, linked to the
// meeting. Owner is the PM; due date as parsed. Actions already on the
// project are skipped, so a double submit can't duplicate them.
export async function addMinutesActions(input: {
  meetingId: string;
  fileName: string;
  actions: { action: string; ownerInMinutes: string; dueText: string }[];
  user: { sub: string; name: string };
}): Promise<{ added: string[]; skippedDuplicates: number }> {
  const meeting = await prisma.meetingMinutes.findUnique({
    where: { id: input.meetingId },
    select: { id: true, meetingDate: true, projectId: true },
  });
  if (!meeting) throw new Error("Meeting not found");
  const pm = await managerOf(meeting.projectId);
  if (!pm?.manager) throw new Error("This project has no Project Manager set");

  const existing = await existingActionTexts(meeting.projectId);
  const added: string[] = [];
  let skippedDuplicates = 0;
  for (const item of input.actions) {
    const text = oneLine(item.action);
    if (!text) continue;
    if (existing.has(normTitle(text))) {
      skippedDuplicates++;
      continue;
    }
    existing.add(normTitle(text));
    const due = parseDueDate(item.dueText);
    const shared = item.ownerInMinutes.trim() && item.ownerInMinutes.trim() !== pm.manager;
    await prisma.actionItem.create({
      data: {
        projectId: meeting.projectId,
        type: "ACTION",
        title: text.length > MAX_TITLE ? `${text.slice(0, MAX_TITLE - 1).trimEnd()}…` : text,
        // The full wording, also used to spot the same action next time.
        description: text,
        ownerName: pm.manager,
        dueDate: due,
        status: "OPEN",
        dateRaised: meeting.meetingDate,
        raisedById: input.user.sub,
        raisedByName: input.user.name,
        notes: `Imported from ${input.fileName}${shared ? ` (owner in minutes: ${item.ownerInMinutes.trim()})` : ""}${
          item.dueText.trim() && !due ? ` · due: ${item.dueText.trim()}` : ""
        }`,
        meetingMinutesId: meeting.id,
      },
    });
    added.push(text);
  }

  if (added.length > 0) {
    await logActivity({
      projectId: pm.project.id,
      projectName: pm.project.name,
      userId: input.user.sub,
      userName: input.user.name,
      action: `imported ${added.length} action${added.length === 1 ? "" : "s"} for ${pm.manager} from "${
        input.fileName
      }"`,
    });
  }
  return { added, skippedDuplicates };
}
