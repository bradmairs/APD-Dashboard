import { prisma } from "./prisma";

// Records which fields changed on an edit, old and new value each, for the
// History list ("Budget changed from $950,000 to $1,100,000 by A. Nguyen").
// Values are stored as display text; long text is cut short since this is
// a trail, not a copy of the record.

const MAX_VALUE = 300;

function show(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value.toISOString().substring(0, 10);
  if (typeof value === "object" && value !== null && "toFixed" in value) {
    return String(value); // Prisma Decimal
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return value.substring(0, 10);
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return text.length > MAX_VALUE ? `${text.slice(0, MAX_VALUE)}…` : text;
}

export function changedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[]
): { field: string; oldValue: string | null; newValue: string | null }[] {
  const out: { field: string; oldValue: string | null; newValue: string | null }[] = [];
  for (const field of fields) {
    if (!(field in after)) continue;
    const oldValue = show(before[field]);
    const newValue = show(after[field]);
    // Compare numbers numerically ("950000.00" vs "950000").
    const same =
      oldValue === newValue ||
      (oldValue !== null && newValue !== null && !isNaN(Number(oldValue)) && Number(oldValue) === Number(newValue));
    if (!same) out.push({ field, oldValue, newValue });
  }
  return out;
}

export async function recordChanges(opts: {
  projectId: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  fields: string[];
  user: { sub: string; name: string };
}) {
  const changes = changedFields(opts.before, opts.after, opts.fields);
  if (changes.length === 0) return;
  try {
    await prisma.fieldChange.createMany({
      data: changes.map((c) => ({
        projectId: opts.projectId,
        entityType: opts.entityType,
        entityId: opts.entityId,
        entityLabel: opts.entityLabel.slice(0, 200),
        field: c.field,
        oldValue: c.oldValue,
        newValue: c.newValue,
        userId: opts.user.sub,
        userName: opts.user.name,
      })),
    });
  } catch (err) {
    // History is a convenience: never fail the edit because of it.
    console.error("Couldn't record field history", err);
  }
}
