import mammoth from "mammoth";
import { prisma } from "./prisma";
import { logActivity } from "./activityLog";
import { extractActionRows, isClosedStatus, ownerMatches, parseDueDate } from "./minutesActions";

export interface ActionImportResult {
  // Who the actions were matched against (the project manager), or null
  // when the project has none set.
  manager: string | null;
  // Rows found in the document's action table(s).
  found: number;
  added: string[];
  skippedOthers: number;
  skippedClosed: number;
  skippedDuplicates: number;
}

const MAX_TITLE = 200;

function normTitle(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

// When a Word minutes document is attached to a meeting, add the project
// manager's actions from its action table to the project's Actions &
// Decisions, linked to that meeting. Rule-based (see minutesActions.ts) —
// no AI needed. Rows assigned only to other people, already-closed rows,
// and actions the project already has (e.g. the same file attached twice)
// are skipped and counted.
export async function importMinutesActions(input: {
  projectId: string;
  meetingId: string;
  filePath: string;
  fileName: string;
  user: { sub: string; name: string };
}): Promise<ActionImportResult> {
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: {
      id: true,
      name: true,
      projectManager: true,
      projectManagerUser: { select: { name: true } },
    },
  });
  const meeting = await prisma.meetingMinutes.findFirst({
    where: { id: input.meetingId, projectId: input.projectId },
    select: { id: true, meetingDate: true },
  });
  const result: ActionImportResult = {
    manager: project?.projectManager ?? project?.projectManagerUser?.name ?? null,
    found: 0,
    added: [],
    skippedOthers: 0,
    skippedClosed: 0,
    skippedDuplicates: 0,
  };
  if (!project || !meeting) return result;

  const { value: html } = await mammoth.convertToHtml({ path: input.filePath });
  const rows = extractActionRows(html);
  result.found = rows.length;
  if (!result.manager || rows.length === 0) return result;

  const managerNames = [project.projectManager, project.projectManagerUser?.name].filter(
    (n): n is string => !!n
  );
  const allOwners = rows.map((r) => r.owner);
  const existing = new Set(
    (
      await prisma.actionItem.findMany({
        where: { projectId: project.id },
        select: { title: true, description: true },
      })
    ).flatMap((a) => [normTitle(a.title), ...(a.description ? [normTitle(a.description)] : [])])
  );

  for (const row of rows) {
    if (!ownerMatches(row.owner, managerNames, allOwners)) {
      result.skippedOthers++;
      continue;
    }
    if (isClosedStatus(row.status)) {
      result.skippedClosed++;
      continue;
    }
    const text = row.action.replace(/\s*\n\s*/g, " ").trim();
    if (existing.has(normTitle(text))) {
      result.skippedDuplicates++;
      continue;
    }
    existing.add(normTitle(text));
    const shared = row.owner.trim() !== result.manager;
    await prisma.actionItem.create({
      data: {
        projectId: project.id,
        type: "ACTION",
        title: text.length > MAX_TITLE ? `${text.slice(0, MAX_TITLE - 1).trimEnd()}…` : text,
        // The full wording, also used to spot the same action next time.
        description: text,
        ownerName: result.manager,
        dueDate: parseDueDate(row.due),
        status: "OPEN",
        dateRaised: meeting.meetingDate,
        raisedById: input.user.sub,
        raisedByName: input.user.name,
        notes: `Imported from ${input.fileName}${shared ? ` (owner in minutes: ${row.owner})` : ""}${
          row.due && !parseDueDate(row.due) ? ` · due: ${row.due}` : ""
        }`,
        meetingMinutesId: meeting.id,
      },
    });
    result.added.push(text);
  }

  if (result.added.length > 0) {
    await logActivity({
      projectId: project.id,
      projectName: project.name,
      userId: input.user.sub,
      userName: input.user.name,
      action: `imported ${result.added.length} action${result.added.length === 1 ? "" : "s"} for ${
        result.manager
      } from "${input.fileName}"`,
    });
  }
  return result;
}
