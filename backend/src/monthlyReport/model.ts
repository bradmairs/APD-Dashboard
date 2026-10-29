// The full content of one month's report, field for field with the input
// cells on the "Monthly Report" tab of the GVW monthly report workbook
// (see workbook.ts for the cell map). Kept as one JSON document on
// MonthlyReport.content rather than ~100 columns: the layout is owned by
// that spreadsheet template, and a JSON shape can follow it without a
// migration every time a row is added.
//
// MIRRORED: frontend/src/monthlyReport/model.ts is a copy of this file so
// the sheet can recalculate its formula cells as you type. Change both.

export type Health = "Green" | "Yellow" | "Red" | "";

export const HEALTH_VALUES: Health[] = ["Green", "Yellow", "Red"];

// Row order of the "Emerging Risks" block (rows 22-31).
export const RISK_CATEGORIES = [
  "Safety",
  "Environmental",
  "Quality",
  "Security",
  "Resource",
  "Procurement",
  "Reputation",
  "Stakeholder",
  "Technical",
  "Commercial",
] as const;

// "Lists (keep hidden)" in the template: phase -> the statuses offered for it.
export const PHASE_STATUSES: Record<string, string[]> = {
  "0 - Pre Gate": ["Proposed"],
  "1 - Initiate": ["Business Case Concept Approved"],
  "2 - Business Case": [
    "Project Justification Report Preparation",
    "Project Justification Report Approved",
  ],
  "3 - Plan": [
    "Project Management Plan Preparation",
    "Concept Design",
    "Functional Design",
    "Detailed Design",
    "External Approvals",
  ],
  "4 - Procurement": ["Tender Preparation", "At Tender", "Contract Awarded"],
  "5 - Implementation": ["Ongoing", "Delivery", "Work Completed"],
  "6 - Close": ["Complete", "Closed"],
  "On Hold": ["On Hold"],
};

export const PROJECT_PHASES = Object.keys(PHASE_STATUSES);

// The template's milestone table has six WBS rows (64-69) above the
// Project Completion row; the completion % formula averages exactly those.
export const MILESTONE_ROWS = 6;

export const DEFAULT_MILESTONE_TASKS = [
  "Design Consultancy Award",
  "Concept Design",
  "Functional Design",
  "Detailed Design",
  "Construction Tender Award",
  "Construction",
];

export const DEFAULT_DOCUMENTS = [
  "Business Case/Justification Report",
  "Latest Project Amendment Advice",
  "Latest Board Papers",
  "Latest Schedule/Program (Optional)",
];

export interface RiskLine {
  category: string;
  health: Health;
  comments: string;
}

export interface MilestoneLine {
  wbs: string;
  task: string;
  // 0-100; the sheet stores a fraction (0.5 = 50%).
  percent: number | null;
  // ISO dates (YYYY-MM-DD). null shows as "-".
  original: string | null;
  approved: string | null;
  forecast: string | null;
  notes: string;
}

export interface DocumentLine {
  description: string;
  reference: string;
}

export interface MonthlyReportContent {
  version: 1;
  projectName: string;
  bpRefNo: string;
  projectManager: string;
  projectDirector: string;
  projectDirectorTitle: string;
  projectSponsor: string;
  projectSponsorTitle: string;

  projectPhase: string;
  phaseNotes: string;
  currentStatus: string;
  statusNotes: string;
  recentlyCompleted: string;
  monthlyLookahead: string;
  risks: RiskLine[];

  originalBudget: number | null;
  originalContingency: number | null;
  businessCaseDoc: string;
  approvedBudget: number | null;
  approvedContingency: number | null;
  budgetApprovalDoc: string;
  expenditureNotes: string;
  forecastNotes: string;
  varianceNotes: string;
  corporatePlanApproved: number | null;
  corporatePlanNotes: string;
  fyForecastNotes: string;
  fyVarianceNotes: string;
  budgetHealth: Health;
  budgetComments: string;
  preFyActual: number | null;
  fy2Forecast: number | null;
  fy3Forecast: number | null;
  postFyForecast: number | null;
  // July..June of the reporting month's financial year, then the next one.
  currentFyMonths: (number | null)[];
  nextFyMonths: (number | null)[];
  forecastChangeNotes: string;

  scheduleHealth: Health;
  scheduleComments: string;
  approvedCompletionReference: string;
  dateApdReceived: string | null;
  milestones: MilestoneLine[];
  completion: {
    original: string | null;
    approved: string | null;
    forecast: string | null;
    notes: string;
  };

  documents: DocumentLine[];
}

export function emptyContent(): MonthlyReportContent {
  return {
    version: 1,
    projectName: "",
    bpRefNo: "",
    projectManager: "",
    projectDirector: "",
    projectDirectorTitle: "",
    projectSponsor: "",
    projectSponsorTitle: "",
    projectPhase: "",
    phaseNotes: "-",
    currentStatus: "",
    statusNotes: "-",
    recentlyCompleted: "",
    monthlyLookahead: "",
    risks: RISK_CATEGORIES.map((category) => ({ category, health: "Green", comments: "-" })),
    originalBudget: null,
    originalContingency: null,
    businessCaseDoc: "",
    approvedBudget: null,
    approvedContingency: null,
    budgetApprovalDoc: "",
    expenditureNotes: "-",
    forecastNotes: "-",
    varianceNotes: "-",
    corporatePlanApproved: null,
    corporatePlanNotes: "",
    fyForecastNotes: "-",
    fyVarianceNotes: "-",
    budgetHealth: "Green",
    budgetComments: "",
    preFyActual: null,
    fy2Forecast: null,
    fy3Forecast: null,
    postFyForecast: null,
    currentFyMonths: Array(12).fill(null),
    nextFyMonths: Array(12).fill(null),
    forecastChangeNotes: "",
    scheduleHealth: "Green",
    scheduleComments: "",
    approvedCompletionReference: "-",
    dateApdReceived: null,
    milestones: DEFAULT_MILESTONE_TASKS.map((task, i) => ({
      wbs: String(i + 1),
      task,
      percent: 0,
      original: null,
      approved: null,
      forecast: null,
      notes: "-",
    })),
    completion: { original: null, approved: null, forecast: null, notes: "" },
    documents: DEFAULT_DOCUMENTS.map((description) => ({ description, reference: "-" })),
  };
}

function str(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return fallback;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function isoDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function health(v: unknown): Health {
  return HEALTH_VALUES.includes(v as Health) ? (v as Health) : "";
}

function months(v: unknown): (number | null)[] {
  const arr = Array.isArray(v) ? v : [];
  return Array.from({ length: 12 }, (_, i) => num(arr[i]));
}

// Coerces anything (client JSON, an older stored shape) into a complete,
// well-typed content object; unknown keys are dropped.
export function normalizeContent(raw: unknown): MonthlyReportContent {
  const base = emptyContent();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const out: MonthlyReportContent = { ...base };
  const textKeys = [
    "projectName", "bpRefNo", "projectManager", "projectDirector", "projectDirectorTitle",
    "projectSponsor", "projectSponsorTitle", "projectPhase", "phaseNotes", "currentStatus",
    "statusNotes", "recentlyCompleted", "monthlyLookahead", "businessCaseDoc",
    "budgetApprovalDoc", "expenditureNotes", "forecastNotes", "varianceNotes",
    "corporatePlanNotes", "fyForecastNotes", "fyVarianceNotes", "budgetComments",
    "forecastChangeNotes", "scheduleComments", "approvedCompletionReference",
  ] as const;
  for (const k of textKeys) if (k in r) out[k] = str(r[k]);
  const numKeys = [
    "originalBudget", "originalContingency", "approvedBudget", "approvedContingency",
    "corporatePlanApproved", "preFyActual", "fy2Forecast", "fy3Forecast", "postFyForecast",
  ] as const;
  for (const k of numKeys) if (k in r) out[k] = num(r[k]);
  if ("budgetHealth" in r) out.budgetHealth = health(r.budgetHealth);
  if ("scheduleHealth" in r) out.scheduleHealth = health(r.scheduleHealth);
  if ("currentFyMonths" in r) out.currentFyMonths = months(r.currentFyMonths);
  if ("nextFyMonths" in r) out.nextFyMonths = months(r.nextFyMonths);
  if ("dateApdReceived" in r) out.dateApdReceived = isoDate(r.dateApdReceived);
  if (Array.isArray(r.risks)) {
    out.risks = RISK_CATEGORIES.map((category) => {
      const line = (r.risks as Record<string, unknown>[]).find((x) => x?.category === category);
      return line
        ? { category, health: health(line.health), comments: str(line.comments) }
        : { category, health: "Green", comments: "-" };
    });
  }
  if (Array.isArray(r.milestones)) {
    out.milestones = Array.from({ length: MILESTONE_ROWS }, (_, i) => {
      const m = ((r.milestones as unknown[])[i] ?? {}) as Record<string, unknown>;
      const p = num(m.percent);
      return {
        wbs: str(m.wbs, String(i + 1)),
        task: str(m.task),
        percent: p === null ? null : Math.max(0, Math.min(100, p)),
        original: isoDate(m.original),
        approved: isoDate(m.approved),
        forecast: isoDate(m.forecast),
        notes: str(m.notes),
      };
    });
  }
  if (r.completion && typeof r.completion === "object") {
    const c = r.completion as Record<string, unknown>;
    out.completion = {
      original: isoDate(c.original),
      approved: isoDate(c.approved),
      forecast: isoDate(c.forecast),
      notes: str(c.notes),
    };
  }
  if (Array.isArray(r.documents)) {
    out.documents = DEFAULT_DOCUMENTS.map((description, i) => {
      const d = ((r.documents as unknown[])[i] ?? {}) as Record<string, unknown>;
      return { description: str(d.description, description), reference: str(d.reference) };
    });
  }
  return out;
}

// ---- Financial year helpers (Australian FY, July-June) -------------------

export const FY_MONTH_NAMES = [
  "July", "August", "September", "October", "November", "December",
  "January", "February", "March", "April", "May", "June",
];

// reportingMonth is "YYYY-MM" (or any ISO date string).
export function parseMonth(reportingMonth: string): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})/.exec(reportingMonth);
  if (!m) throw new Error(`Bad reporting month: ${reportingMonth}`);
  return { year: Number(m[1]), month: Number(m[2]) };
}

export function fyStartYear(reportingMonth: string): number {
  const { year, month } = parseMonth(reportingMonth);
  return month >= 7 ? year : year - 1;
}

// 0 = July ... 11 = June.
export function fiscalIndex(reportingMonth: string): number {
  return (parseMonth(reportingMonth).month + 5) % 12;
}

export function fyLabel(startYear: number): string {
  return `FY ${startYear}/${String(startYear + 1).slice(-2)}`;
}

export function monthLabel(reportingMonth: string): string {
  const { year, month } = parseMonth(reportingMonth);
  const names = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];
  return `${names[month - 1]} ${year}`;
}

// ---- The sheet's formula cells ---------------------------------------------

export interface DerivedValues {
  title: string;
  fyLabels: {
    preFy: string;
    current: string;
    next: string;
    plus2: string;
    plus3: string;
    post: string;
  };
  // Row 50: which months of the current FY are actuals.
  monthKinds: ("Actual" | "Forecast")[];
  emergingRiskHealth: Health;
  emergingRiskComments: string;
  currentFyActual: number;
  currentFyForecastRemainder: number;
  nextFyTotal: number;
  expenditureToDate: number;
  forecastTotal: number;
  variance: number;
  fyForecastTotal: number;
  fyVariance: number;
  completionPercent: number | null;
}

const RANK: Record<Health, number> = { "": 0, Green: 1, Yellow: 2, Red: 3 };

export function derive(content: MonthlyReportContent, reportingMonth: string): DerivedValues {
  const fy = fyStartYear(reportingMonth);
  const idx = fiscalIndex(reportingMonth);
  const monthKinds = FY_MONTH_NAMES.map((_, i) => (i <= idx ? "Actual" : "Forecast") as "Actual" | "Forecast");
  const n = (v: number | null) => v ?? 0;

  const worst = content.risks.reduce<Health>(
    (acc, r) => (RANK[r.health] > RANK[acc] ? r.health : acc),
    ""
  );
  const comments = content.risks
    .filter((r) => RANK[r.health] > 1)
    .map((r) => `${r.health} --- ${r.category} Risk --- ${r.comments}`)
    .join("\n");

  const currentFyActual = content.currentFyMonths.reduce<number>(
    (s, v, i) => (monthKinds[i] === "Actual" ? s + n(v) : s), 0);
  const currentFyForecastRemainder = content.currentFyMonths.reduce<number>(
    (s, v, i) => (monthKinds[i] === "Forecast" ? s + n(v) : s), 0);
  const nextFyTotal = content.nextFyMonths.reduce<number>((s, v) => s + n(v), 0);
  const expenditureToDate = n(content.preFyActual) + currentFyActual;
  const forecastTotal =
    expenditureToDate + currentFyForecastRemainder + nextFyTotal +
    n(content.fy2Forecast) + n(content.fy3Forecast) + n(content.postFyForecast);
  const fyForecastTotal = currentFyActual + currentFyForecastRemainder;

  const percents = content.milestones
    .map((m) => m.percent)
    .filter((p): p is number => typeof p === "number");
  const completionPercent = percents.length
    ? percents.reduce((s, p) => s + p, 0) / percents.length
    : null;

  return {
    title: `Monthly Project Report - ${monthLabel(reportingMonth)}`,
    fyLabels: {
      preFy: `Pre ${fyLabel(fy)}`,
      current: fyLabel(fy),
      next: fyLabel(fy + 1),
      plus2: fyLabel(fy + 2),
      plus3: fyLabel(fy + 3),
      post: `Post ${fyLabel(fy + 3)}`,
    },
    monthKinds,
    emergingRiskHealth: worst,
    emergingRiskComments: comments,
    currentFyActual,
    currentFyForecastRemainder,
    nextFyTotal,
    expenditureToDate,
    forecastTotal,
    variance: n(content.approvedBudget) - forecastTotal,
    fyForecastTotal,
    fyVariance: n(content.corporatePlanApproved) - fyForecastTotal,
    completionPercent,
  };
}

// The dashboard's own RAG enum, kept on MonthlyReport's original columns so
// the rest of the app (health roll-ups, lists) keeps working.
export function healthToRag(h: Health): "GREEN" | "AMBER" | "RED" {
  return h === "Red" ? "RED" : h === "Yellow" ? "AMBER" : "GREEN";
}

export function ragToHealth(rag: string | null | undefined): Health {
  return rag === "RED" ? "Red" : rag === "AMBER" ? "Yellow" : rag === "GREEN" ? "Green" : "";
}
