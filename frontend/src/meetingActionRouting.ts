import { ActionItemInput, SuggestedAction, TaskInput } from "./types";

export type SuggestionDestination = "TASK" | "ACTION";

function normalize(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

// The AI only ever gives a free-text owner ("Alex", "Alex S", "Alex Smith"),
// so this matches on full name or first name. It's only a default: the
// review list lets the user flip any suggestion before it's saved.
export function isOwnedByUser(ownerName: string | null, userName: string | undefined): boolean {
  if (!ownerName || !userName) return false;
  const owner = normalize(ownerName);
  const user = normalize(userName);
  if (owner.length === 0 || user.length === 0) return false;
  if (owner.join(" ") === user.join(" ")) return true;
  return owner[0] === user[0] && user[0].length > 1;
}

export function defaultDestinations(
  suggestions: SuggestedAction[],
  userName: string | undefined
): SuggestionDestination[] {
  return suggestions.map((s) => (isOwnedByUser(s.ownerName, userName) ? "TASK" : "ACTION"));
}

export function suggestionToTask(
  s: SuggestedAction,
  meetingMinutesId: string,
  meetingLabel: string
): Partial<TaskInput> {
  const details = [
    `From meeting: ${meetingLabel}`,
    s.dueDateHint ? `Suggested due: ${s.dueDateHint}` : null,
  ].filter(Boolean);
  return {
    title: s.title,
    description: details.join(" · "),
    status: "TODO",
    recurrence: "NONE",
    dueDate: null,
    meetingMinutesId,
  };
}

export function suggestionToAction(
  s: SuggestedAction,
  meetingMinutesId: string,
  meetingDate: string
): Partial<ActionItemInput> {
  return {
    title: s.title,
    type: "ACTION",
    status: "OPEN",
    dateRaised: meetingDate,
    ownerName: s.ownerName,
    notes: s.dueDateHint ? `Suggested due: ${s.dueDateHint}` : null,
    meetingMinutesId,
  };
}

export function meetingLabel(meeting: { title: string | null; meetingType: string | null; meetingDate: string }): string {
  const date = meeting.meetingDate.slice(0, 10);
  const name = meeting.title || meeting.meetingType || "Meeting";
  return `${name} (${date})`;
}
