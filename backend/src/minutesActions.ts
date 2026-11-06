// Reads the action table out of a Word meeting-minutes document — no AI.
//
// Minutes come in many layouts, but the actions are almost always in a
// table whose header row names an action column and an owner column, e.g.
// "No. | Action | Owner | Due | Status" or "Item | Action Required |
// Responsible | By When". mammoth turns the .docx into simple HTML that
// keeps those tables, so this finds every table with such a header and
// reads its rows. Narrative "Brad will…" sentences are deliberately not
// guessed at: only tabled actions are imported.

export interface ActionRow {
  action: string;
  owner: string;
  due: string;
  status: string;
}

// ---- HTML tables -----------------------------------------------------------

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

// A cell's text: paragraphs and line breaks become newlines, tags dropped.
function cellText(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|li|h\d)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

// Top-level tables as rows of cell text. Tables nested inside a cell are
// left to their own pass (a nested table's rows aren't the outer table's).
export function parseTables(html: string): string[][][] {
  const tables: string[][][] = [];
  const tagRe = /<(\/?)(table|tr|td|th)\b[^>]*>/gi;
  type Frame = { rows: string[][]; row: string[] | null; cellStart: number; cellDepth: number };
  const stack: Frame[] = [];
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html))) {
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    const top = stack[stack.length - 1];
    if (tag === "table") {
      if (!closing) stack.push({ rows: [], row: null, cellStart: -1, cellDepth: 0 });
      else if (top) {
        stack.pop();
        tables.push(top.rows);
      }
      continue;
    }
    if (!top) continue;
    if (tag === "tr") {
      if (!closing) top.row = [];
      else if (top.row) {
        top.rows.push(top.row);
        top.row = null;
      }
    } else if (!closing) {
      top.cellStart = tagRe.lastIndex;
    } else if (top.row && top.cellStart >= 0) {
      top.row.push(cellText(html.slice(top.cellStart, m.index)));
      top.cellStart = -1;
    }
  }
  return tables;
}

// ---- Finding the action table ---------------------------------------------

const ACTION_HEADER = /^(actions?|action items?|action required|actions? required|tasks?|description|item|details|actions? \/ decisions?)$/;
const OWNER_HEADER = /^(owner|owners|responsible|responsibility|resp\.?|who|by whom|assigned( to)?|action (by|owner|officer)|person responsible|lead)$/;
const DUE_HEADER = /^(due|due date|date due|by when|when|target( date)?|deadline|timing|completion date|date)$/;
const STATUS_HEADER = /^(status|state|progress|complete|open\s*\/\s*closed)$/;

function normHeader(text: string): string {
  return text.toLowerCase().replace(/[:*]/g, "").replace(/\s+/g, " ").trim();
}

// The action rows of every table that has both an action and an owner
// column (header row: the first row whose cells name both).
export function extractActionRows(html: string): ActionRow[] {
  const rows: ActionRow[] = [];
  for (const table of parseTables(html)) {
    const headerIndex = table.findIndex(
      (r) => r.some((c) => ACTION_HEADER.test(normHeader(c))) && r.some((c) => OWNER_HEADER.test(normHeader(c)))
    );
    if (headerIndex < 0) continue;
    const header = table[headerIndex].map(normHeader);
    // Prefer an "Action…" column, then Task/Description/Details, and only
    // then "Item" — which is often just the numbering column.
    const actionCol = [
      (h: string) => /^action/.test(h) && !OWNER_HEADER.test(h),
      (h: string) => /^(tasks?|description|details)$/.test(h),
      (h: string) => ACTION_HEADER.test(h),
    ]
      .map((test) => header.findIndex(test))
      .find((i) => i >= 0) ?? -1;
    const ownerCol = header.findIndex((h) => OWNER_HEADER.test(h));
    const dueCol = header.findIndex((h) => DUE_HEADER.test(h));
    const statusCol = header.findIndex((h) => STATUS_HEADER.test(h));
    if (actionCol < 0 || ownerCol < 0) continue;
    for (const r of table.slice(headerIndex + 1)) {
      const action = (r[actionCol] ?? "").trim();
      if (!action) continue;
      rows.push({
        action,
        owner: (r[ownerCol] ?? "").trim(),
        due: dueCol >= 0 ? (r[dueCol] ?? "").trim() : "",
        status: statusCol >= 0 ? (r[statusCol] ?? "").trim() : "",
      });
    }
  }
  return rows;
}

// ---- Matching the owner to the project manager -----------------------------

function normName(text: string): string {
  return text
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // "Brad Mairs (CMP)"
    .replace(/[^a-z\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// An owner cell can name several people: "Brad / Lachlan", "BM, JE".
function ownerParts(owner: string): string[] {
  return owner
    .split(/[,;/&+\n]|\band\b/i)
    .map(normName)
    .filter(Boolean);
}

// True when the owner cell names one of `managerNames` (the project
// manager), as a full name, initials ("BM"), "Brad M", "B Mairs", the
// surname, or the first name alone — the first name only when no other
// owner in the same minutes shares it, so "Brad" can't match a different
// Brad.
export function ownerMatches(owner: string, managerNames: string[], allOwners: string[] = []): boolean {
  const parts = ownerParts(owner);
  const others = allOwners.flatMap(ownerParts);
  for (const manager of managerNames) {
    const tokens = normName(manager).split(" ").filter(Boolean);
    if (tokens.length === 0) continue;
    const first = tokens[0];
    const last = tokens[tokens.length - 1];
    const full = tokens.join(" ");
    const forms = new Set([full]);
    if (tokens.length > 1) {
      forms.add(`${first} ${last}`);
      forms.add(`${first} ${last[0]}`);
      forms.add(`${first[0]} ${last}`);
      forms.add(tokens.map((t) => t[0]).join(""));
      forms.add(last);
    }
    for (const part of parts) {
      if (forms.has(part)) return true;
      if (part === first) {
        // First name alone: only if no other owner has this first name
        // with a different surname.
        const clash = others.some((o) => {
          const t = o.split(" ");
          return t.length > 1 && t[0] === first && t[t.length - 1] !== last;
        });
        if (!clash) return true;
      }
    }
  }
  return false;
}

// ---- Due dates ----------------------------------------------------------------

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

// "5 Nov 2026", "5 November 2026", "05/11/2026" (Australian day/month),
// "5/11/26", "2026-11-05". Anything else ("TBC", "ASAP", "Ongoing") is no
// due date.
export function parseDueDate(text: string): Date | null {
  const t = text.trim().toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, "$1");
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (m) return utc(+m[1], +m[2] - 1, +m[3]);
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/.exec(t);
  if (m) return utc(year(+m[3]), +m[2] - 1, +m[1]);
  m = /^(?:[a-z]+,?\s+)?(\d{1,2})\s+([a-z]{3,9})\.?,?\s+(\d{2,4})\b/.exec(t);
  if (m && MONTHS[m[2].slice(0, 4)] !== undefined) return utc(year(+m[3]), MONTHS[m[2].slice(0, 4)], +m[1]);
  if (m && MONTHS[m[2].slice(0, 3)] !== undefined) return utc(year(+m[3]), MONTHS[m[2].slice(0, 3)], +m[1]);
  return null;
}

function year(y: number): number {
  return y < 100 ? 2000 + y : y;
}

function utc(y: number, monthIndex: number, d: number): Date | null {
  const date = new Date(Date.UTC(y, monthIndex, d));
  return date.getUTCMonth() === monthIndex && date.getUTCDate() === d ? date : null;
}

const CLOSED_STATUS = /^(closed|complete|completed|done|finished|n\/?a)$/i;

export function isClosedStatus(status: string): boolean {
  return CLOSED_STATUS.test(status.trim());
}
