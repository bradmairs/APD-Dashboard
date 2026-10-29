import JSZip from "jszip";
import {
  DEFAULT_DOCUMENTS,
  FY_MONTH_NAMES,
  Health,
  HEALTH_VALUES,
  MILESTONE_ROWS,
  MonthlyReportContent,
  RISK_CATEGORIES,
  derive,
  emptyContent,
  monthLabel,
} from "./model";

// Reads and writes the GVW monthly report workbook (.xlsm) in place.
//
// The file is edited at the XML level rather than through a spreadsheet
// library: every library that rewrites the whole workbook drops something
// the PMs rely on (the VBA project, data validation lists, conditional
// formatting extensions). Here only the <c> elements of the input cells we
// own are replaced, so the macro, formulas, styles and everything else in
// the package come back byte-for-byte. Formula cells are left alone and
// Excel recalculates them on open (fullCalcOnLoad).

export const REPORT_SHEET = "Monthly Report";
export const SNAPSHOT_SHEET = "Snapshot";
export const LOG_SHEET = "Reporting Log";
export const LOG_TABLE = "tblReportingLog";

type CellKind = "text" | "number" | "date" | "percent";

interface CellSpec {
  ref: string;
  kind: CellKind;
  get: (c: MonthlyReportContent) => string | number | null;
  set: (c: MonthlyReportContent, v: string | number | null) => void;
}

function textCell(ref: string, key: keyof MonthlyReportContent): CellSpec {
  return {
    ref,
    kind: "text",
    get: (c) => c[key] as string,
    set: (c, v) => {
      (c as unknown as Record<string, unknown>)[key] = v === null ? "" : String(v);
    },
  };
}

function numberCell(ref: string, key: keyof MonthlyReportContent): CellSpec {
  return {
    ref,
    kind: "number",
    get: (c) => c[key] as number | null,
    set: (c, v) => {
      (c as unknown as Record<string, unknown>)[key] = typeof v === "number" ? v : null;
    },
  };
}

const COLS = "BCDEFGHIJKLM".split("");

// Every input cell on the "Monthly Report" tab, by address.
export function reportCellMap(): CellSpec[] {
  const cells: CellSpec[] = [
    textCell("D7", "projectName"),
    textCell("D8", "bpRefNo"),
    textCell("D9", "projectManager"),
    textCell("D10", "projectDirector"),
    textCell("H10", "projectDirectorTitle"),
    textCell("D11", "projectSponsor"),
    textCell("H11", "projectSponsorTitle"),
    textCell("D15", "projectPhase"),
    textCell("H15", "phaseNotes"),
    textCell("D16", "currentStatus"),
    textCell("H16", "statusNotes"),
    textCell("B18", "recentlyCompleted"),
    textCell("B20", "monthlyLookahead"),
    numberCell("D34", "originalBudget"),
    numberCell("H34", "originalContingency"),
    textCell("L34", "businessCaseDoc"),
    numberCell("D35", "approvedBudget"),
    numberCell("H35", "approvedContingency"),
    textCell("L35", "budgetApprovalDoc"),
    textCell("H36", "expenditureNotes"),
    textCell("H37", "forecastNotes"),
    textCell("H38", "varianceNotes"),
    numberCell("E40", "corporatePlanApproved"),
    textCell("G40", "corporatePlanNotes"),
    textCell("H41", "fyForecastNotes"),
    textCell("H42", "fyVarianceNotes"),
    textCell("D43", "budgetHealth"),
    textCell("H43", "budgetComments"),
    numberCell("B47", "preFyActual"),
    numberCell("H47", "fy2Forecast"),
    numberCell("J47", "fy3Forecast"),
    numberCell("L47", "postFyForecast"),
    textCell("B57", "forecastChangeNotes"),
    textCell("D60", "scheduleHealth"),
    textCell("H60", "scheduleComments"),
    textCell("I61", "approvedCompletionReference"),
    {
      ref: "J63",
      kind: "date",
      get: (c) => c.dateApdReceived,
      set: (c, v) => (c.dateApdReceived = typeof v === "string" ? v : null),
    },
  ];
  RISK_CATEGORIES.forEach((_, i) => {
    const row = 22 + i;
    cells.push(
      {
        ref: `D${row}`,
        kind: "text",
        get: (c) => c.risks[i].health,
        set: (c, v) => (c.risks[i].health = toHealth(v)),
      },
      {
        ref: `H${row}`,
        kind: "text",
        get: (c) => c.risks[i].comments,
        set: (c, v) => (c.risks[i].comments = v === null ? "" : String(v)),
      }
    );
  });
  for (let i = 0; i < 12; i++) {
    cells.push(
      {
        ref: `${COLS[i]}51`,
        kind: "number",
        get: (c) => c.currentFyMonths[i],
        set: (c, v) => (c.currentFyMonths[i] = typeof v === "number" ? v : null),
      },
      {
        ref: `${COLS[i]}55`,
        kind: "number",
        get: (c) => c.nextFyMonths[i],
        set: (c, v) => (c.nextFyMonths[i] = typeof v === "number" ? v : null),
      }
    );
  }
  for (let i = 0; i < MILESTONE_ROWS; i++) {
    const row = 64 + i;
    const m = (c: MonthlyReportContent) => c.milestones[i];
    cells.push(
      { ref: `B${row}`, kind: "text", get: (c) => m(c).wbs, set: (c, v) => (m(c).wbs = v === null ? "" : String(v)) },
      { ref: `C${row}`, kind: "text", get: (c) => m(c).task, set: (c, v) => (m(c).task = v === null ? "" : String(v)) },
      {
        ref: `F${row}`,
        kind: "percent",
        get: (c) => m(c).percent,
        set: (c, v) => (m(c).percent = typeof v === "number" ? v : null),
      },
      { ref: `G${row}`, kind: "date", get: (c) => m(c).original, set: (c, v) => (m(c).original = asDate(v)) },
      { ref: `H${row}`, kind: "date", get: (c) => m(c).approved, set: (c, v) => (m(c).approved = asDate(v)) },
      { ref: `I${row}`, kind: "date", get: (c) => m(c).forecast, set: (c, v) => (m(c).forecast = asDate(v)) },
      { ref: `J${row}`, kind: "text", get: (c) => m(c).notes, set: (c, v) => (m(c).notes = v === null ? "" : String(v)) }
    );
  }
  cells.push(
    { ref: "G70", kind: "date", get: (c) => c.completion.original, set: (c, v) => (c.completion.original = asDate(v)) },
    { ref: "H70", kind: "date", get: (c) => c.completion.approved, set: (c, v) => (c.completion.approved = asDate(v)) },
    { ref: "I70", kind: "date", get: (c) => c.completion.forecast, set: (c, v) => (c.completion.forecast = asDate(v)) },
    { ref: "J70", kind: "text", get: (c) => c.completion.notes, set: (c, v) => (c.completion.notes = v === null ? "" : String(v)) }
  );
  for (let i = 0; i < DEFAULT_DOCUMENTS.length; i++) {
    const row = 74 + i;
    cells.push(
      {
        ref: `B${row}`,
        kind: "text",
        get: (c) => c.documents[i].description,
        set: (c, v) => (c.documents[i].description = v === null ? "" : String(v)),
      },
      {
        ref: `J${row}`,
        kind: "text",
        get: (c) => c.documents[i].reference,
        set: (c, v) => (c.documents[i].reference = v === null ? "" : String(v)),
      }
    );
  }
  return cells;
}

function toHealth(v: unknown): Health {
  const s = typeof v === "string" ? v.trim() : "";
  const match = HEALTH_VALUES.find((h) => h.toLowerCase() === s.toLowerCase());
  if (match) return match;
  return s.toLowerCase() === "amber" ? "Yellow" : "";
}

function asDate(v: string | number | null): string | null {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

// ---- Excel value conversions ------------------------------------------------

const EPOCH = Date.UTC(1899, 11, 30);

export function serialToIso(serial: number): string {
  const d = new Date(EPOCH + Math.round(serial * 86400000));
  return d.toISOString().slice(0, 10);
}

export function isoToSerial(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return (Date.UTC(y, m - 1, d) - EPOCH) / 86400000;
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july",
  "august", "september", "october", "november", "december"];

// "September 2026", a date serial, or an ISO date -> "2026-09".
export function toReportingMonth(v: CellValue): string | null {
  if (typeof v === "number") return serialToIso(v).slice(0, 7);
  if (typeof v !== "string") return null;
  const iso = /^(\d{4})-(\d{2})/.exec(v);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const m = /([a-z]+)\s+(\d{4})/i.exec(v.trim());
  if (!m) return null;
  const idx = MONTHS.findIndex((name) => name.startsWith(m[1].toLowerCase().slice(0, 3)));
  return idx < 0 ? null : `${m[2]}-${String(idx + 1).padStart(2, "0")}`;
}

// ---- Minimal OOXML reading ---------------------------------------------------

export type CellValue = string | number | boolean | null | { error: string };

function decodeXml(s: string): string {
  return s
    .replace(/_x([0-9A-Fa-f]{4})_/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function encodeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Control characters other than tab/newline aren't legal XML 1.0.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\r\n?/g, "\n");
}

// Text of an <si> / <is>: all <t> runs, skipping phonetic (<rPh>) runs.
function richText(xml: string): string {
  const withoutPhonetic = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
  let out = "";
  for (const m of withoutPhonetic.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t(?:\s[^>]*)?\/>/g)) {
    out += m[1] ? decodeXml(m[1]) : "";
  }
  return out;
}

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? decodeXml(m[1]) : null;
}

export function colToNum(col: string): number {
  return col.split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
}

export function numToCol(n: number): string {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function splitRef(ref: string): { col: string; row: number } {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) throw new Error(`Bad cell ref ${ref}`);
  return { col: m[1], row: Number(m[2]) };
}

class Workbook {
  private constructor(
    readonly zip: JSZip,
    private sheetPaths: Map<string, string>,
    readonly sharedStrings: string[]
  ) {}

  static async load(buffer: Buffer): Promise<Workbook> {
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(buffer);
    } catch {
      throw new WorkbookError("That file isn't an Excel workbook (.xlsm / .xlsx).");
    }
    const wbXml = await zip.file("xl/workbook.xml")?.async("string");
    const relsXml = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");
    if (!wbXml || !relsXml) throw new WorkbookError("That file isn't an Excel workbook (.xlsm / .xlsx).");
    const rels = new Map<string, string>();
    for (const m of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
      const id = attr(m[0], "Id");
      const target = attr(m[0], "Target");
      if (id && target) rels.set(id, target.startsWith("/") ? target.slice(1) : `xl/${target}`);
    }
    const sheetPaths = new Map<string, string>();
    for (const m of wbXml.matchAll(/<sheet\b[^>]*>/g)) {
      const name = attr(m[0], "name");
      const rid = attr(m[0], "r:id");
      if (name && rid && rels.has(rid)) sheetPaths.set(name, rels.get(rid)!);
    }
    const sst = await zip.file("xl/sharedStrings.xml")?.async("string");
    const shared = sst ? [...sst.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => richText(m[1])) : [];
    return new Workbook(zip, sheetPaths, shared);
  }

  hasSheet(name: string): boolean {
    return this.sheetPaths.has(name);
  }

  sheetPath(name: string): string {
    const p = this.sheetPaths.get(name);
    if (!p) throw new WorkbookError(`The workbook has no "${name}" tab.`);
    return p;
  }

  async sheetXml(name: string): Promise<string> {
    const xml = await this.zip.file(this.sheetPath(name))?.async("string");
    if (!xml) throw new WorkbookError(`The "${name}" tab couldn't be read.`);
    return xml;
  }

  cellValue(cellXml: string): CellValue {
    const open = /^<c\b[^>]*>/.exec(cellXml)?.[0] ?? cellXml;
    const t = attr(open, "t");
    if (t === "inlineStr") {
      const is = /<is>([\s\S]*?)<\/is>/.exec(cellXml);
      return is ? richText(is[1]) : "";
    }
    const v = /<v>([\s\S]*?)<\/v>/.exec(cellXml)?.[1];
    if (v === undefined) return null;
    if (t === "s") return this.sharedStrings[Number(v)] ?? "";
    if (t === "str") return decodeXml(v);
    if (t === "b") return v === "1";
    if (t === "e") return { error: decodeXml(v) };
    const n = Number(v);
    return Number.isFinite(n) ? n : decodeXml(v);
  }

  // All cell values of a sheet, keyed by address.
  async readSheet(name: string): Promise<Map<string, CellValue>> {
    const xml = await this.sheetXml(name);
    const out = new Map<string, CellValue>();
    for (const m of xml.matchAll(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g)) {
      const ref = attr(m[0].slice(0, m[0].indexOf(">") + 1), "r");
      if (ref) out.set(ref, this.cellValue(m[0]));
    }
    return out;
  }
}

export class WorkbookError extends Error {}

// ---- Reading a report ------------------------------------------------------

function cellToSpecValue(spec: CellSpec, v: CellValue): string | number | null {
  if (v === null || typeof v === "boolean" || (typeof v === "object" && v !== null)) {
    return spec.kind === "text" ? "" : null;
  }
  switch (spec.kind) {
    case "text":
      return typeof v === "number" ? String(v) : v;
    case "number":
      return typeof v === "number" ? v : null;
    case "percent":
      return typeof v === "number" ? Math.round(v * 1000) / 10 : null;
    case "date":
      if (typeof v === "number") return serialToIso(v);
      return /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null;
  }
}

function normHeader(h: string): string {
  return h.toLowerCase().replace(/\s+/g, " ").replace(/:$/, "").trim();
}

// Snapshot / Reporting Log columns that map straight to a content field.
// Derived columns (Expenditure to Date, Variance, ...) are recalculated, not
// read back.
const LOG_FIELDS: Record<string, (c: MonthlyReportContent, v: CellValue) => void> = {
  "project name": (c, v) => (c.projectName = asText(v)),
  "bp ref. no.": (c, v) => (c.bpRefNo = asText(v)),
  "project manager": (c, v) => (c.projectManager = asText(v)),
  "project director name": (c, v) => (c.projectDirector = asText(v)),
  "project director title": (c, v) => (c.projectDirectorTitle = asText(v)),
  "project sponsor name": (c, v) => (c.projectSponsor = asText(v)),
  "project sponsor title": (c, v) => (c.projectSponsorTitle = asText(v)),
  "project phase": (c, v) => (c.projectPhase = asText(v)),
  "current status": (c, v) => (c.currentStatus = asText(v)),
  "recently completed": (c, v) => (c.recentlyCompleted = asText(v)),
  "monthly lookahead": (c, v) => (c.monthlyLookahead = asText(v)),
  "emerging risk health comments": (c, v) => applyRiskComments(c, asText(v)),
  "original project budget": (c, v) => (c.originalBudget = asNum(v)),
  "original included contingency": (c, v) => (c.originalContingency = asNum(v)),
  "business case doc": (c, v) => (c.businessCaseDoc = asText(v)),
  "approved project budget": (c, v) => (c.approvedBudget = asNum(v)),
  "included contingency": (c, v) => (c.approvedContingency = asNum(v)),
  "approved included contingency": (c, v) => (c.approvedContingency = asNum(v)),
  "budget approval doc": (c, v) => (c.budgetApprovalDoc = asText(v)),
  "fy corporate plan approved": (c, v) => (c.corporatePlanApproved = asNum(v)),
  "budget health": (c, v) => (c.budgetHealth = toHealth(v)),
  "budget health comments": (c, v) => (c.budgetComments = asText(v)),
  "previous years actual": (c, v) => (c.preFyActual = asNum(v)),
  "year +2 forecast": (c, v) => (c.fy2Forecast = asNum(v)),
  "year +3 forecast": (c, v) => (c.fy3Forecast = asNum(v)),
  "future forecast": (c, v) => (c.postFyForecast = asNum(v)),
  "forecast change notes": (c, v) => (c.forecastChangeNotes = asText(v)),
  "program health": (c, v) => (c.scheduleHealth = toHealth(v)),
  "schedule health": (c, v) => (c.scheduleHealth = toHealth(v)),
  "program health comments": (c, v) => (c.scheduleComments = asText(v)),
  "schedule health comments": (c, v) => (c.scheduleComments = asText(v)),
  "approved project completion target": (c, v) => (c.completion.approved = asIso(v)),
  "forecast project completion": (c, v) => (c.completion.forecast = asIso(v)),
};
FY_MONTH_NAMES.forEach((name, i) => {
  LOG_FIELDS[`current year - ${name.toLowerCase()}`] = (c, v) => (c.currentFyMonths[i] = asNum(v));
  LOG_FIELDS[`next year - ${name.toLowerCase()}`] = (c, v) => (c.nextFyMonths[i] = asNum(v));
});

function asText(v: CellValue): string {
  if (v === null || typeof v === "boolean" || typeof v === "object") return "";
  return String(v);
}

function asNum(v: CellValue): number | null {
  return typeof v === "number" ? v : null;
}

function asIso(v: CellValue): string | null {
  if (typeof v === "number") return serialToIso(v);
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null;
}

// The log only keeps the concatenated "Yellow --- Procurement Risk --- ..."
// text; split it back into the per-category lines it was built from.
function applyRiskComments(c: MonthlyReportContent, text: string) {
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*(Green|Yellow|Red)\s*---\s*(.+?)\s+Risk\s*---\s*(.*)$/i.exec(line);
    if (!m) continue;
    const risk = c.risks.find((r) => r.category.toLowerCase() === m[2].toLowerCase());
    if (risk) {
      risk.health = toHealth(m[1]);
      risk.comments = m[3];
    }
  }
}

export interface ParsedMonth {
  reportingMonth: string;
  content: MonthlyReportContent;
}

export interface ParsedWorkbook {
  // The month currently on the Monthly Report tab, with every input cell.
  current: ParsedMonth | null;
  // Months already logged on the Reporting Log tab (fewer fields: the log
  // has no milestones, notes or document references).
  log: ParsedMonth[];
}

export async function readReportWorkbook(buffer: Buffer): Promise<ParsedWorkbook> {
  const wb = await Workbook.load(buffer);
  if (!wb.hasSheet(REPORT_SHEET)) {
    throw new WorkbookError(`This doesn't look like a monthly report workbook: there's no "${REPORT_SHEET}" tab.`);
  }
  const cells = await wb.readSheet(REPORT_SHEET);
  let current: ParsedMonth | null = null;
  const month = toReportingMonth(cells.get("D14") ?? null);
  if (month) {
    const content = emptyContent();
    for (const spec of reportCellMap()) {
      spec.set(content, cellToSpecValue(spec, cells.get(spec.ref) ?? null));
    }
    current = { reportingMonth: month, content };
  }

  const log: ParsedMonth[] = [];
  if (wb.hasSheet(LOG_SHEET)) {
    const rows = await sheetRows(wb, LOG_SHEET);
    const header = rows.get(1);
    if (header) {
      const monthCol = [...header].find(([, h]) => normHeader(String(h ?? "")) === "reporting month")?.[0];
      for (const [r, row] of rows) {
        if (r === 1 || !monthCol) continue;
        const rm = toReportingMonth(row.get(monthCol) ?? null);
        if (!rm) continue;
        const content = emptyContent();
        content.milestones = content.milestones.map((m) => ({ ...m, task: "", wbs: m.wbs, percent: null, notes: "" }));
        content.risks = content.risks.map((risk) => ({ ...risk, health: "Green", comments: "-" }));
        for (const [col, h] of header) {
          const apply = LOG_FIELDS[normHeader(String(h ?? ""))];
          if (apply) apply(content, row.get(col) ?? null);
        }
        log.push({ reportingMonth: rm, content });
      }
    }
  }
  return { current, log };
}

async function sheetRows(wb: Workbook, name: string): Promise<Map<number, Map<string, CellValue>>> {
  const cells = await wb.readSheet(name);
  const rows = new Map<number, Map<string, CellValue>>();
  for (const [ref, v] of cells) {
    const { col, row } = splitRef(ref);
    if (!rows.has(row)) rows.set(row, new Map());
    rows.get(row)!.set(col, v);
  }
  return new Map([...rows].sort((a, b) => a[0] - b[0]));
}

// ---- Writing a report --------------------------------------------------------

type WriteValue = string | number | null | { error: string };

function cellXml(ref: string, style: string | null, v: WriteValue): string {
  const s = style ? ` s="${style}"` : "";
  if (v === null || v === "") return `<c r="${ref}"${s}/>`;
  if (typeof v === "number") return `<c r="${ref}"${s}><v>${v}</v></c>`;
  if (typeof v === "object") return `<c r="${ref}"${s} t="e"><v>${encodeXml(v.error)}</v></c>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${encodeXml(v)}</t></is></c>`;
}

const CELL_RE = (ref: string) => new RegExp(`<c r="${ref}"(?=[\\s>/])[^>]*?(?:/>|>[\\s\\S]*?</c>)`);

function splice(s: string, start: number, deleteCount: number, insert: string): string {
  return s.slice(0, start) + insert + s.slice(start + deleteCount);
}

// Replaces (or inserts, in column order) one cell in a sheet's XML. Uses
// index splicing, never String.replace, so "$&"-style sequences in cell text
// can't be misread as replacement patterns.
export function setCell(sheet: string, ref: string, v: WriteValue, styleOverride?: string | null): string {
  const { col, row } = splitRef(ref);
  const existing = CELL_RE(ref).exec(sheet);
  if (existing) {
    const open = existing[0].slice(0, existing[0].indexOf(">") + 1);
    const style = styleOverride !== undefined ? styleOverride : attr(open, "s");
    return splice(sheet, existing.index, existing[0].length, cellXml(ref, style, v));
  }
  const newCell = cellXml(ref, styleOverride ?? null, v);
  const rowRe = new RegExp(`<row r="${row}"(?=[\\s>/])[^>]*?(?:/>|>[\\s\\S]*?</row>)`);
  const rowMatch = rowRe.exec(sheet);
  if (rowMatch) {
    const rowXml = rowMatch[0];
    if (rowXml.endsWith("/>")) {
      return splice(sheet, rowMatch.index, rowXml.length, `${rowXml.slice(0, -2)}>${newCell}</row>`);
    }
    const innerStart = rowXml.indexOf(">") + 1;
    const inner = rowXml.slice(innerStart, rowXml.length - "</row>".length);
    const target = colToNum(col);
    const after = [...inner.matchAll(/<c r="([A-Z]+)\d+"[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g)].find(
      (c) => colToNum(c[1]) > target
    );
    const at = rowMatch.index + innerStart + (after ? after.index! : inner.length);
    return splice(sheet, at, 0, newCell);
  }
  // No such row yet: insert one in row order.
  const newRow = `<row r="${row}">${newCell}</row>`;
  const next = [...sheet.matchAll(/<row r="(\d+)"/g)].find((r) => Number(r[1]) > row);
  if (next) return splice(sheet, next.index!, 0, newRow);
  const empty = sheet.indexOf("<sheetData/>");
  if (empty >= 0) return splice(sheet, empty, "<sheetData/>".length, `<sheetData>${newRow}</sheetData>`);
  return splice(sheet, sheet.indexOf("</sheetData>"), 0, newRow);
}

function specToCellValue(spec: CellSpec, content: MonthlyReportContent): WriteValue {
  const v = spec.get(content);
  if (v === null || v === "") return null;
  switch (spec.kind) {
    case "text":
      return String(v);
    case "number":
      return typeof v === "number" ? v : null;
    case "percent":
      return typeof v === "number" ? v / 100 : null;
    case "date":
      return typeof v === "string" ? isoToSerial(v) : null;
  }
}

function sameValue(a: CellValue, b: WriteValue): boolean {
  if ((a === null || a === "") && (b === null || b === "")) return true;
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-9;
  if (typeof a === "string" && typeof b === "string") {
    return a.replace(/\r\n?/g, "\n") === b.replace(/\r\n?/g, "\n");
  }
  return false;
}

export interface WriteOptions {
  // Also record the month on the Reporting Log tab, as the workbook's own
  // "Log Monthly Report" macro does (replacing that month's row if it's
  // already there, so re-syncing a month updates it rather than failing).
  log?: boolean;
}

export interface WriteResult {
  buffer: Buffer;
  cellsChanged: number;
  logged: "appended" | "replaced" | null;
}

export async function writeReportWorkbook(
  buffer: Buffer,
  reportingMonth: string,
  content: MonthlyReportContent,
  options: WriteOptions = {}
): Promise<WriteResult> {
  const wb = await Workbook.load(buffer);
  const path = wb.sheetPath(REPORT_SHEET);
  let sheet = await wb.sheetXml(REPORT_SHEET);
  const before = await wb.readSheet(REPORT_SHEET);
  let changed = 0;

  const writes: [string, WriteValue, CellKind][] = [["D14", monthLabel(reportingMonth), "text"]];
  for (const spec of reportCellMap()) writes.push([spec.ref, specToCellValue(spec, content), spec.kind]);
  for (const [ref, raw, kind] of writes) {
    const prev = before.get(ref) ?? null;
    // A date the dashboard doesn't have yet leaves a "-" or "TBC" alone.
    if (kind === "date" && raw === null && typeof prev === "string") continue;
    // Keep numbers typed into text fields (e.g. a numeric BP Ref) numeric.
    const v = typeof prev === "number" && typeof raw === "string" && /^-?\d+(\.\d+)?$/.test(raw.trim())
      ? Number(raw)
      : raw;
    // Unchanged cells are left exactly as they are — including any a PM has
    // turned into their own formula (e.g. a forecast built up from a sum).
    if (sameValue(prev, v)) continue;
    sheet = setCell(sheet, ref, v);
    changed++;
  }
  wb.zip.file(path, sheet);

  let logged: WriteResult["logged"] = null;
  if (options.log) logged = await appendLogRow(wb, reportingMonth, content);

  await forceRecalcOnOpen(wb.zip);
  const out = await wb.zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    mimeType: "application/vnd.ms-excel.sheet.macroEnabled.12",
  });
  return { buffer: out, cellsChanged: changed, logged };
}

// Cached formula results are stale once inputs change; have Excel recompute
// on open, and drop calcChain.xml (Excel rebuilds it, and a stale one makes
// it "repair" the file if a formula cell was overwritten with a value).
async function forceRecalcOnOpen(zip: JSZip) {
  let wbXml = (await zip.file("xl/workbook.xml")!.async("string"));
  if (/<calcPr\b[^>]*\/>/.test(wbXml) || /<calcPr\b[^>]*>/.test(wbXml)) {
    wbXml = wbXml.replace(/<calcPr\b([^>]*?)(\/?)>/, (_m, attrs: string, selfClose: string) => {
      const cleaned = attrs.replace(/\sfullCalcOnLoad="[^"]*"/, "");
      return `<calcPr${cleaned} fullCalcOnLoad="1"${selfClose}>`;
    });
  } else {
    // Schema order puts calcPr straight after definedNames (or sheets).
    const anchor = wbXml.includes("</definedNames>") ? "</definedNames>" : "</sheets>";
    wbXml = wbXml.replace(anchor, () => `${anchor}<calcPr fullCalcOnLoad="1"/>`);
  }
  zip.file("xl/workbook.xml", wbXml);
  if (zip.file("xl/calcChain.xml")) {
    zip.remove("xl/calcChain.xml");
    const rels = await zip.file("xl/_rels/workbook.xml.rels")!.async("string");
    zip.file("xl/_rels/workbook.xml.rels", rels.replace(/<Relationship\b[^>]*calcChain[^>]*\/>/, ""));
    const ct = await zip.file("[Content_Types].xml")!.async("string");
    zip.file("[Content_Types].xml", ct.replace(/<Override\b[^>]*calcChain[^>]*\/>/, ""));
  }
}

// Values for each Reporting Log column, by (normalised) header.
function logValues(reportingMonth: string, c: MonthlyReportContent): Record<string, WriteValue> {
  const d = derive(c, reportingMonth);
  const iso = (s: string | null) => (s ? isoToSerial(s) : null);
  const v: Record<string, WriteValue> = {
    "project name": c.projectName,
    "bp ref. no.": numericIfPossible(c.bpRefNo),
    "project manager": c.projectManager,
    "project director name": c.projectDirector,
    "project director title": c.projectDirectorTitle,
    "project sponsor name": c.projectSponsor,
    "project sponsor title": c.projectSponsorTitle,
    "reporting month": isoToSerial(`${reportingMonth}-01`),
    "project phase": c.projectPhase,
    "current status": c.currentStatus,
    "recently completed": c.recentlyCompleted,
    "monthly lookahead": c.monthlyLookahead,
    "emerging risk health": d.emergingRiskHealth,
    "emerging risk health comments": d.emergingRiskComments,
    "original project budget": c.originalBudget,
    "original included contingency": c.originalContingency,
    "business case doc": c.businessCaseDoc,
    "approved project budget": c.approvedBudget,
    "included contingency": c.approvedContingency,
    "approved included contingency": c.approvedContingency,
    "budget approval doc": c.budgetApprovalDoc,
    "expenditure to date": d.expenditureToDate,
    "forecast total": d.forecastTotal,
    "variance": d.variance,
    "fy corporate plan approved": c.corporatePlanApproved,
    "fy forecast total": d.fyForecastTotal,
    "fy variance": d.fyVariance,
    "budget health": c.budgetHealth,
    "budget health comments": c.budgetComments,
    "previous years actual": c.preFyActual,
    "current year actual": d.currentFyActual,
    "current year forecast": d.currentFyForecastRemainder,
    "year +1 forecast": d.nextFyTotal,
    "year +2 forecast": c.fy2Forecast,
    "year +3 forecast": c.fy3Forecast,
    "future forecast": c.postFyForecast,
    "forecast change notes": c.forecastChangeNotes,
    "program health": c.scheduleHealth,
    "schedule health": c.scheduleHealth,
    "program health comments": c.scheduleComments,
    "schedule health comments": c.scheduleComments,
    "approved project completion target": iso(c.completion.approved),
    "forecast project completion": iso(c.completion.forecast),
  };
  FY_MONTH_NAMES.forEach((name, i) => {
    v[`current year - ${name.toLowerCase()}`] = c.currentFyMonths[i];
    v[`next year - ${name.toLowerCase()}`] = c.nextFyMonths[i];
  });
  return v;
}

function numericIfPossible(s: string): string | number {
  return /^\d+(\.\d+)?$/.test(s.trim()) ? Number(s) : s;
}

async function appendLogRow(
  wb: Workbook,
  reportingMonth: string,
  content: MonthlyReportContent
): Promise<"appended" | "replaced"> {
  if (!wb.hasSheet(LOG_SHEET)) throw new WorkbookError(`The workbook has no "${LOG_SHEET}" tab to log the month on.`);
  const path = wb.sheetPath(LOG_SHEET);
  let sheet = await wb.sheetXml(LOG_SHEET);
  const rows = await sheetRows(wb, LOG_SHEET);
  const header = rows.get(1);
  if (!header) throw new WorkbookError(`The "${LOG_SHEET}" tab has no header row.`);
  const monthCol = [...header].find(([, h]) => normHeader(String(h ?? "")) === "reporting month")?.[0];

  let target: number | null = null;
  let lastRow = 1;
  for (const [r, row] of rows) {
    if (r === 1) continue;
    if ([...row.values()].some((v) => v !== null && v !== "")) lastRow = Math.max(lastRow, r);
    if (monthCol && toReportingMonth(row.get(monthCol) ?? null) === reportingMonth) target = r;
  }
  const replacing = target !== null;
  const rowNum = target ?? lastRow + 1;

  // Columns the dashboard doesn't model (the spare reporting slots) take
  // whatever the workbook's own Snapshot row currently shows.
  const snapshot = wb.hasSheet(SNAPSHOT_SHEET) ? (await sheetRows(wb, SNAPSHOT_SHEET)).get(2) : undefined;
  const values = logValues(reportingMonth, content);
  // Copy styles (date and currency formats) from the row above.
  const styleRow = lastRow > 1 ? lastRow : null;
  const styles = new Map<string, string | null>();
  if (styleRow) {
    for (const m of sheet.matchAll(new RegExp(`<c r="([A-Z]+)${styleRow}"[^>]*>`, "g"))) {
      styles.set(m[1], attr(m[0], "s"));
    }
  }
  for (const [col, h] of header) {
    const key = normHeader(String(h ?? ""));
    let v: WriteValue;
    if (key in values) v = values[key];
    else {
      const snap = snapshot?.get(col) ?? null;
      v = typeof snap === "boolean" ? String(snap) : snap;
    }
    const style = replacing ? undefined : styles.get(col) ?? null;
    sheet = setCell(sheet, `${col}${rowNum}`, v, style);
  }

  const lastCol = numToCol(Math.max(...[...header.keys()].map(colToNum)));
  const endRow = Math.max(lastRow, rowNum);
  sheet = sheet.replace(/<dimension ref="[^"]*"\/>/, () => `<dimension ref="A1:${lastCol}${endRow}"/>`);
  wb.zip.file(path, sheet);
  await extendTable(wb, path, LOG_TABLE, endRow);
  return replacing ? "replaced" : "appended";
}

async function extendTable(wb: Workbook, sheetPath: string, tableName: string, endRow: number) {
  const relsPath = sheetPath.replace(/([^/]+)$/, "_rels/$1.rels");
  const rels = await wb.zip.file(relsPath)?.async("string");
  if (!rels) return;
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const target = attr(m[0], "Target");
    if (!target || !/tables\//.test(target)) continue;
    const tablePath = target.startsWith("/")
      ? target.slice(1)
      : new URL(target, `http://x/${sheetPath}`).pathname.slice(1);
    const xml = await wb.zip.file(tablePath)?.async("string");
    if (!xml || attr(/<table\b[^>]*>/.exec(xml)?.[0] ?? "", "name") !== tableName) continue;
    const updated = xml.replace(/(<(?:table|autoFilter)\b[^>]*\sref=")([A-Z]+\d+):([A-Z]+)\d+(")/g,
      (_m, pre: string, start: string, endCol: string, post: string) => `${pre}${start}:${endCol}${endRow}${post}`);
    wb.zip.file(tablePath, updated);
  }
}
