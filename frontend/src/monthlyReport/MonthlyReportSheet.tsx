import { ReactNode, useLayoutEffect, useRef, useState } from "react";
import gvwLogo from "../assets/gvw-logo.png";
import {
  FY_MONTH_NAMES,
  HEALTH_VALUES,
  Health,
  MonthlyReportContent,
  PHASE_STATUSES,
  PROJECT_PHASES,
  derive,
  monthLabel,
} from "./model";

// The "Monthly Report" tab of the GVW monthly report workbook, laid out on
// the same 12-column grid (B..M) with the same labels, colours and formula
// cells, so the dashboard's copy reads exactly like the spreadsheet. Pass
// onChange to make it editable; without it, it renders read-only (print).

interface Props {
  content: MonthlyReportContent;
  reportingMonth: string;
  onChange?: (content: MonthlyReportContent) => void;
  // Content keys filled from the project's data (shown with a blue corner).
  autoFields?: Set<string>;
}

// Column widths of B..M in the template, in Excel character units.
const GRID = "16.7fr 17.3fr 15.7fr repeat(9, 13fr)";

const C = {
  section: "#00B0F0",
  label: "#D9D9D9",
  subLabel: "#F2F2F2",
  formula: "#E7E6E6",
};

const HEALTH_STYLE: Record<Health, { bg: string; fg: string }> = {
  Green: { bg: "#C6EFCE", fg: "#006100" },
  Yellow: { bg: "#FFEB9C", fg: "#9C5700" },
  Red: { bg: "#FFC7CE", fg: "#9C0006" },
  "": { bg: "#FFFFFF", fg: "#000000" },
};

const NEGATIVE = { bg: "#FFC7CE", fg: "#9C0006" };

function money(v: number | null): { sign: string; text: string } {
  if (v === null || Math.round(v) === 0) return { sign: "$", text: "-" };
  const abs = Math.abs(Math.round(v)).toLocaleString("en-AU");
  return { sign: "$", text: v < 0 ? `(${abs})` : abs };
}

function shortDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(`${iso}T00:00:00Z`);
  const m = d.toLocaleDateString("en-AU", { month: "short", timeZone: "UTC" });
  return `${m}-${String(d.getUTCFullYear()).slice(-2)}`;
}

type Span = [start: number, end?: number];

function Cell({
  col,
  rowSpan,
  bg,
  fg,
  bold,
  italic,
  align = "left",
  valign = "center",
  border = true,
  minH,
  auto,
  className = "",
  children,
}: {
  col: Span;
  rowSpan?: number;
  bg?: string;
  fg?: string;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  valign?: "top" | "center";
  border?: boolean;
  minH?: number;
  auto?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const [start, end = start] = col;
  return (
    <div
      className={`relative flex px-1.5 py-0.5 ${valign === "top" ? "items-start" : "items-center"} ${
        align === "center" ? "justify-center text-center" : align === "right" ? "justify-end text-right" : ""
      } ${className}`}
      style={{
        gridColumn: `${start} / ${end + 1}`,
        gridRow: rowSpan ? `span ${rowSpan}` : undefined,
        background: bg ?? "#FFFFFF",
        color: fg,
        fontWeight: bold ? 700 : undefined,
        fontStyle: italic ? "italic" : undefined,
        boxShadow: border ? "0 0 0 0.5px #000" : undefined,
        minHeight: minH,
      }}
    >
      {auto && (
        <span
          title="Filled from the project's data"
          className="absolute left-0 top-0 print:hidden"
          style={{
            width: 0,
            height: 0,
            borderStyle: "solid",
            borderWidth: "8px 8px 0 0",
            borderColor: "#2F75B5 transparent transparent transparent",
          }}
        />
      )}
      {children}
    </div>
  );
}

const inputClass =
  "w-full bg-transparent outline-none focus:ring-2 focus:ring-inset focus:ring-[#2F75B5] rounded-[1px] disabled:cursor-default";

function TextInput({
  value,
  onChange,
  align = "left",
  readOnly,
}: {
  value: string;
  onChange?: (v: string) => void;
  align?: "left" | "center";
  readOnly: boolean;
}) {
  if (readOnly) return <span className={`w-full whitespace-pre-wrap ${align === "center" ? "text-center" : ""}`}>{value}</span>;
  return (
    <input
      className={`${inputClass} ${align === "center" ? "text-center" : ""}`}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}

function TextArea({
  value,
  onChange,
  readOnly,
  minRows = 2,
}: {
  value: string;
  onChange?: (v: string) => void;
  readOnly: boolean;
  minRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  if (readOnly) return <div className="w-full whitespace-pre-wrap py-0.5">{value}</div>;
  return (
    <textarea
      ref={ref}
      rows={minRows}
      className={`${inputClass} resize-none overflow-hidden py-0.5 leading-snug`}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}

function MoneyInput({
  value,
  onChange,
  readOnly,
}: {
  value: number | null;
  onChange?: (v: number | null) => void;
  readOnly: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const m = money(value);
  if (readOnly || editing === null) {
    return (
      <button
        type="button"
        disabled={readOnly}
        onClick={() => setEditing(value === null ? "" : String(value))}
        onFocus={() => !readOnly && setEditing(value === null ? "" : String(value))}
        className="flex w-full justify-between gap-1 tabular-nums disabled:cursor-default"
      >
        <span>{m.sign}</span>
        <span>{m.text}</span>
      </button>
    );
  }
  return (
    <input
      autoFocus
      inputMode="decimal"
      className={`${inputClass} text-right tabular-nums`}
      value={editing}
      onChange={(e) => setEditing(e.target.value)}
      onBlur={() => {
        const cleaned = editing.replace(/[$,\s]/g, "");
        const n = cleaned === "" || cleaned === "-" ? null : Number(cleaned);
        onChange?.(n === null || Number.isFinite(n) ? n : value);
        setEditing(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setEditing(null);
      }}
    />
  );
}

function MoneyValue({ value }: { value: number }) {
  const m = money(value);
  return (
    <span className="flex w-full justify-between gap-1 tabular-nums">
      <span>{m.sign}</span>
      <span>{m.text}</span>
    </span>
  );
}

function DateInput({
  value,
  onChange,
  readOnly,
  align = "center",
}: {
  value: string | null;
  onChange?: (v: string | null) => void;
  readOnly: boolean;
  align?: "left" | "center";
}) {
  const [editing, setEditing] = useState(false);
  if (readOnly || !editing) {
    return (
      <button
        type="button"
        disabled={readOnly}
        onClick={() => setEditing(true)}
        onFocus={() => !readOnly && setEditing(true)}
        className={`w-full disabled:cursor-default ${align === "center" ? "text-center" : "text-left"}`}
      >
        {shortDate(value)}
      </button>
    );
  }
  return (
    <input
      autoFocus
      type="date"
      className={`${inputClass} text-center text-[0.85em]`}
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value || null)}
      onBlur={() => setEditing(false)}
    />
  );
}

function HealthSelect({
  value,
  onChange,
  readOnly,
}: {
  value: Health;
  onChange?: (v: Health) => void;
  readOnly: boolean;
}) {
  if (readOnly) return <span className="w-full text-center">{value || "Click to Select"}</span>;
  return (
    <select
      className={`${inputClass} cursor-pointer text-center [text-align-last:center]`}
      value={value}
      onChange={(e) => onChange?.(e.target.value as Health)}
    >
      <option value="">Click to Select</option>
      {HEALTH_VALUES.map((h) => (
        <option key={h} value={h}>
          {h}
        </option>
      ))}
    </select>
  );
}

function Select({
  value,
  options,
  onChange,
  readOnly,
}: {
  value: string;
  options: string[];
  onChange?: (v: string) => void;
  readOnly: boolean;
}) {
  if (readOnly) return <span className="w-full">{value}</span>;
  const all = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <select className={`${inputClass} cursor-pointer`} value={value} onChange={(e) => onChange?.(e.target.value)}>
      <option value="">Click to Select</option>
      {all.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function PercentInput({
  value,
  onChange,
  readOnly,
}: {
  value: number | null;
  onChange?: (v: number | null) => void;
  readOnly: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const text = value === null ? "" : `${Math.round(value)}%`;
  if (readOnly || editing === null) {
    return (
      <button
        type="button"
        disabled={readOnly}
        onClick={() => setEditing(value === null ? "" : String(value))}
        onFocus={() => !readOnly && setEditing(value === null ? "" : String(value))}
        className="w-full text-center tabular-nums disabled:cursor-default"
      >
        {text}
      </button>
    );
  }
  return (
    <input
      autoFocus
      inputMode="numeric"
      className={`${inputClass} text-center tabular-nums`}
      value={editing}
      onChange={(e) => setEditing(e.target.value)}
      onBlur={() => {
        const cleaned = editing.replace(/[%\s]/g, "");
        const n = cleaned === "" ? null : Math.max(0, Math.min(100, Number(cleaned)));
        onChange?.(n === null || Number.isFinite(n) ? n : value);
        setEditing(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setEditing(null);
      }}
    />
  );
}

function Section({ title }: { title: string }) {
  return (
    <Cell col={[1, 12]} bg={C.section} fg="#FFFFFF" bold minH={40} className="text-[1.15em] tracking-wide">
      {title}
    </Cell>
  );
}

function Spacer({ h = 14 }: { h?: number }) {
  return <div style={{ gridColumn: "1 / 13", height: h }} />;
}

export default function MonthlyReportSheet({ content, reportingMonth, onChange, autoFields }: Props) {
  const readOnly = !onChange;
  const d = derive(content, reportingMonth);
  const isAuto = (key: string) => !!autoFields?.has(key);

  // Small helper: update a copy and hand it back.
  function update(fn: (draft: MonthlyReportContent) => void) {
    if (!onChange) return;
    const next = structuredClone(content);
    fn(next);
    onChange(next);
  }
  const text = (key: keyof MonthlyReportContent) => ({
    value: content[key] as string,
    onChange: (v: string) => update((c) => ((c as unknown as Record<string, unknown>)[key] = v)),
    readOnly,
  });
  const num = (key: keyof MonthlyReportContent) => ({
    value: content[key] as number | null,
    onChange: (v: number | null) => update((c) => ((c as unknown as Record<string, unknown>)[key] = v)),
    readOnly,
  });

  // Statuses are offered for the chosen phase, not enforced, so a status
  // imported from the workbook survives even if it isn't on the list.
  const statuses = PHASE_STATUSES[content.projectPhase] ?? [];

  const label = (col: Span, children: ReactNode, extra: Partial<Parameters<typeof Cell>[0]> = {}) => (
    <Cell col={col} bg={C.label} bold {...extra}>
      {children}
    </Cell>
  );
  const healthCell = (col: Span, value: Health, set: ((v: Health) => void) | undefined, auto = false) => (
    <Cell col={col} bg={HEALTH_STYLE[value].bg} fg={HEALTH_STYLE[value].fg} align="center" auto={auto}>
      <HealthSelect value={value} onChange={set} readOnly={readOnly} />
    </Cell>
  );
  const formulaMoney = (col: Span, value: number, negativeRed = false) => {
    const neg = negativeRed && value < 0;
    return (
      <Cell col={col} bg={neg ? NEGATIVE.bg : C.formula} fg={neg ? NEGATIVE.fg : undefined}>
        <MoneyValue value={value} />
      </Cell>
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white text-black shadow-sm dark:border-slate-700 print:overflow-visible print:border-0 print:shadow-none">
      <div
        className="min-w-[1000px] p-6 text-[13px] leading-tight print:min-w-0 print:p-0"
        style={{ fontFamily: '"Franklin Gothic Book", "Franklin Gothic", "Libre Franklin", "Arial Narrow", Arial, sans-serif' }}
      >
        <div className="grid" style={{ gridTemplateColumns: GRID }}>
          {/* Header: logo, organisation, report title */}
          <div style={{ gridColumn: "1 / 3", gridRow: "span 2" }} className="flex items-center py-1">
            <img src={gvwLogo} alt="Goulburn Valley Water" className="h-[68px] w-auto" />
          </div>
          <div style={{ gridColumn: "3 / 13" }} className="flex items-end justify-end text-[1.35em] font-bold">
            GOULBURN VALLEY REGION WATER CORPORATION
          </div>
          <div style={{ gridColumn: "3 / 13" }} className="flex items-start justify-end pt-1 text-[1.2em] font-bold">
            {d.title}
          </div>
          <Spacer h={18} />

          <Section title="PROJECT INFORMATION" />
          {label([1, 2], "Project Name:")}
          <Cell col={[3, 12]} auto={isAuto("projectName")}><TextInput {...text("projectName")} /></Cell>
          {label([1, 2], "BP Ref. No.:")}
          <Cell col={[3, 12]} auto={isAuto("bpRefNo")}><TextInput {...text("bpRefNo")} /></Cell>
          {label([1, 2], "Project Manager:")}
          <Cell col={[3, 12]} auto={isAuto("projectManager")}><TextInput {...text("projectManager")} /></Cell>
          {label([1, 2], "Project Director:")}
          <Cell col={[3, 5]} auto={isAuto("projectDirector")}><TextInput {...text("projectDirector")} /></Cell>
          {label([6, 6], "Title:")}
          <Cell col={[7, 12]}><TextInput {...text("projectDirectorTitle")} /></Cell>
          {label([1, 2], "Project Sponsor:")}
          <Cell col={[3, 5]} auto={isAuto("projectSponsor")}><TextInput {...text("projectSponsor")} /></Cell>
          {label([6, 6], "Title:")}
          <Cell col={[7, 12]}><TextInput {...text("projectSponsorTitle")} /></Cell>
          <Spacer />

          <Section title="CURRENT STATUS" />
          {label([1, 2], "Reporting Month:")}
          <Cell col={[3, 5]}>{monthLabel(reportingMonth)}</Cell>
          <div style={{ gridColumn: "6 / 13" }} />
          {label([1, 2], "Project Phase:")}
          <Cell col={[3, 5]} auto={isAuto("projectPhase")}>
            <Select
              value={content.projectPhase}
              options={PROJECT_PHASES}
              onChange={(v) => update((c) => (c.projectPhase = v))}
              readOnly={readOnly}
            />
          </Cell>
          {label([6, 6], "Notes:")}
          <Cell col={[7, 12]}><TextInput {...text("phaseNotes")} /></Cell>
          {label([1, 2], "Current Status:")}
          <Cell col={[3, 5]} auto={isAuto("currentStatus")}>
            <Select
              value={content.currentStatus}
              options={statuses}
              onChange={(v) => update((c) => (c.currentStatus = v))}
              readOnly={readOnly}
            />
          </Cell>
          {label([6, 6], "Notes:")}
          <Cell col={[7, 12]}><TextInput {...text("statusNotes")} /></Cell>
          {label([1, 12], "Recently Completed")}
          <Cell col={[1, 12]} valign="top" minH={60} auto={isAuto("recentlyCompleted")}>
            <TextArea {...text("recentlyCompleted")} minRows={2} />
          </Cell>
          {label([1, 12], "Monthly Lookahead")}
          <Cell col={[1, 12]} valign="top" minH={84} auto={isAuto("monthlyLookahead")}>
            <TextArea {...text("monthlyLookahead")} minRows={3} />
          </Cell>
          {label([1, 2], (
            <span>
              Emerging Risk Health:
              <br />
              <i>(formula based on highest risk health)</i>
            </span>
          ), { minH: 80 })}
          <Cell
            col={[3, 4]}
            align="center"
            bg={HEALTH_STYLE[d.emergingRiskHealth].bg}
            fg={HEALTH_STYLE[d.emergingRiskHealth].fg}
          >
            {d.emergingRiskHealth || "no entry"}
          </Cell>
          {label([5, 6], (
            <span>
              Yellow and Red Status Comments Automatically Reported:
              <br />
              <i>(formula)</i>
            </span>
          ))}
          <Cell col={[7, 12]} valign="top" className="whitespace-pre-wrap">{d.emergingRiskComments}</Cell>
          <Cell col={[1, 1]} rowSpan={content.risks.length} bg={C.label} bold align="center">
            Emerging Risks:
          </Cell>
          {content.risks.map((r, i) => (
            <RiskRow
              key={r.category}
              category={r.category}
              health={r.health}
              comments={r.comments}
              readOnly={readOnly}
              auto={isAuto("risks")}
              healthCell={healthCell}
              onHealth={(v) => update((c) => (c.risks[i].health = v))}
              onComments={(v) => update((c) => (c.risks[i].comments = v))}
            />
          ))}
          <Spacer />

          <Section title="BUDGET & CASH FLOWS" />
          {label([1, 2], "Project Original Budget:")}
          <Cell col={[3, 4]} auto={isAuto("originalBudget")}><MoneyInput {...num("originalBudget")} /></Cell>
          {label([5, 6], "Included Contingency:")}
          <Cell col={[7, 8]}><MoneyInput {...num("originalContingency")} /></Cell>
          {label([9, 10], "Business Case Doc:")}
          <Cell col={[11, 12]}><TextInput {...text("businessCaseDoc")} /></Cell>
          {label([1, 2], "Project Approved Budget:")}
          <Cell col={[3, 4]} auto={isAuto("approvedBudget")}><MoneyInput {...num("approvedBudget")} /></Cell>
          {label([5, 6], "Included Contingency:")}
          <Cell col={[7, 8]}><MoneyInput {...num("approvedContingency")} /></Cell>
          {label([9, 10], "Budget Approval Doc:")}
          <Cell col={[11, 12]}><TextInput {...text("budgetApprovalDoc")} /></Cell>
          {label([1, 2], "Project Expenditure to Date:")}
          {formulaMoney([3, 4], d.expenditureToDate)}
          <Cell col={[5, 6]} italic>(formula)</Cell>
          <Cell col={[7, 12]}><TextInput {...text("expenditureNotes")} /></Cell>
          {label([1, 2], "Project Forecast Total:")}
          {formulaMoney([3, 4], d.forecastTotal)}
          <Cell col={[5, 6]} italic>(formula)</Cell>
          <Cell col={[7, 12]}><TextInput {...text("forecastNotes")} /></Cell>
          {label([1, 2], "Project Variance:")}
          {formulaMoney([3, 4], d.variance, true)}
          <Cell col={[5, 6]} italic>(formula)</Cell>
          <Cell col={[7, 12]}><TextInput {...text("varianceNotes")} /></Cell>
          <Spacer h={10} />
          {label([1, 3], `${d.fyLabels.current} Corporate Plan Approved:`)}
          <Cell
            col={[4, 5]}
            bg={(content.corporatePlanApproved ?? 0) < 0 ? NEGATIVE.bg : undefined}
          >
            <MoneyInput {...num("corporatePlanApproved")} />
          </Cell>
          <Cell col={[6, 12]}><TextInput {...text("corporatePlanNotes")} /></Cell>
          {label([1, 3], `${d.fyLabels.current} Forecast Total:`)}
          {formulaMoney([4, 5], d.fyForecastTotal, true)}
          <Cell col={[6, 6]} italic>(formula)</Cell>
          <Cell col={[7, 12]}><TextInput {...text("fyForecastNotes")} /></Cell>
          {label([1, 3], `${d.fyLabels.current} Variance:`)}
          {formulaMoney([4, 5], d.fyVariance, true)}
          <Cell col={[6, 6]} italic>(formula)</Cell>
          <Cell col={[7, 12]}><TextInput {...text("fyVarianceNotes")} /></Cell>
          {label([1, 2], "Cashflow/Budget Health:")}
          {healthCell([3, 4], content.budgetHealth, readOnly ? undefined : (v) => update((c) => (c.budgetHealth = v)))}
          {label([5, 6], "Comments:")}
          <Cell col={[7, 12]} valign="top" minH={80}><TextArea {...text("budgetComments")} minRows={4} /></Cell>

          {label([1, 12], "Annual Breakdown")}
          {[
            [[1, 2], d.fyLabels.preFy],
            [[3, 4], d.fyLabels.current],
            [[5, 6], d.fyLabels.next],
            [[7, 8], d.fyLabels.plus2],
            [[9, 10], d.fyLabels.plus3],
            [[11, 12], d.fyLabels.post],
          ].map(([col, t]) => (
            <Cell key={t as string} col={col as Span} bg={C.subLabel} bold align="center" minH={32}>
              {t as string}
            </Cell>
          ))}
          <Cell col={[1, 2]} bg={C.subLabel} bold align="center">Actual</Cell>
          <Cell col={[3, 3]} bg={C.subLabel} bold align="center" minH={64}>
            <span>Actual to Date This FY<br /><i>(formula)</i></span>
          </Cell>
          <Cell col={[4, 4]} bg={C.subLabel} bold align="center">
            <span>Forecast Remainder This FY<br /><i>(formula)</i></span>
          </Cell>
          <Cell col={[5, 6]} bg={C.subLabel} bold align="center">
            <span>Forecast<br /><i>(formula)</i></span>
          </Cell>
          <Cell col={[7, 8]} bg={C.subLabel} bold align="center">Forecast</Cell>
          <Cell col={[9, 10]} bg={C.subLabel} bold align="center">Forecast</Cell>
          <Cell col={[11, 12]} bg={C.subLabel} bold align="center">Forecast</Cell>
          <Cell col={[1, 2]} auto={isAuto("preFyActual")}><MoneyInput {...num("preFyActual")} /></Cell>
          {formulaMoney([3, 3], d.currentFyActual)}
          {formulaMoney([4, 4], d.currentFyForecastRemainder)}
          {formulaMoney([5, 6], d.nextFyTotal)}
          <Cell col={[7, 8]} auto={isAuto("fy2Forecast")}><MoneyInput {...num("fy2Forecast")} /></Cell>
          <Cell col={[9, 10]} auto={isAuto("fy3Forecast")}><MoneyInput {...num("fy3Forecast")} /></Cell>
          <Cell col={[11, 12]} auto={isAuto("postFyForecast")}><MoneyInput {...num("postFyForecast")} /></Cell>

          {label([1, 12], `Monthly Breakdown - Current Financial Year (${d.fyLabels.current})`)}
          {FY_MONTH_NAMES.map((m, i) => (
            <Cell key={`cm${m}`} col={[i + 1]} bg={C.subLabel} bold align="center" minH={32}>{m}</Cell>
          ))}
          {d.monthKinds.map((k, i) => (
            <Cell key={`ck${i}`} col={[i + 1]} bg={C.subLabel} align="center" minH={32}>{k}</Cell>
          ))}
          {content.currentFyMonths.map((v, i) => (
            <Cell key={`cv${i}`} col={[i + 1]} minH={32} auto={isAuto("currentFyMonths")}>
              <MoneyInput
                value={v}
                readOnly={readOnly}
                onChange={(n) => update((c) => (c.currentFyMonths[i] = n))}
              />
            </Cell>
          ))}
          {label([1, 12], `Monthly Breakdown - Next Financial Year (${d.fyLabels.next})`)}
          {FY_MONTH_NAMES.map((m) => (
            <Cell key={`nm${m}`} col={[FY_MONTH_NAMES.indexOf(m) + 1]} bg={C.subLabel} bold align="center" minH={32}>{m}</Cell>
          ))}
          {FY_MONTH_NAMES.map((m, i) => (
            <Cell key={`nk${m}`} col={[i + 1]} bg={C.subLabel} align="center" minH={32}>Forecast</Cell>
          ))}
          {content.nextFyMonths.map((v, i) => (
            <Cell key={`nv${i}`} col={[i + 1]} minH={32} auto={isAuto("nextFyMonths")}>
              <MoneyInput
                value={v}
                readOnly={readOnly}
                onChange={(n) => update((c) => (c.nextFyMonths[i] = n))}
              />
            </Cell>
          ))}
          {label([1, 12], "Forecast Change Notes:")}
          <Cell col={[1, 12]} valign="top" minH={44}><TextArea {...text("forecastChangeNotes")} minRows={1} /></Cell>
          <Spacer />

          <Section title="SCHEDULE / MAJOR MILESTONES" />
          {label([1, 2], "Schedule Health:")}
          {healthCell([3, 4], content.scheduleHealth, readOnly ? undefined : (v) => update((c) => (c.scheduleHealth = v)))}
          {label([5, 6], "Comments:")}
          <Cell col={[7, 12]} valign="top" minH={80}><TextArea {...text("scheduleComments")} minRows={3} /></Cell>
          {label([1, 4], "Project Milestones")}
          {label([5, 7], "Approved Completion Target Reference:")}
          <Cell col={[8, 12]} align="center"><TextInput {...text("approvedCompletionReference")} align="center" /></Cell>
          {[
            [[1, 1], "WBS Item"],
            [[2, 4], "Task/Activity"],
            [[5, 5], "Percentage Completed"],
            [[6, 6], "Original Business Case Dates"],
            [[7, 7], "Current Approved Completion Target"],
            [[8, 8], "Forecast / Actual Completion"],
            [[9, 12], "Notes"],
          ].map(([col, t]) => (
            <Cell key={t as string} col={col as Span} bg={C.label} bold italic align="center" minH={88}>
              {t as string}
            </Cell>
          ))}
          <Cell col={[1, 1]} bold align="center">0</Cell>
          <Cell col={[2, 4]} bold>Date APD Received the Project</Cell>
          <Cell col={[5, 5]} />
          <Cell col={[6, 6]} />
          <Cell col={[7, 7]} />
          <Cell col={[8, 8]} />
          <Cell col={[9, 12]} auto={isAuto("dateApdReceived")}>
            <DateInput
              value={content.dateApdReceived}
              align="left"
              readOnly={readOnly}
              onChange={(v) => update((c) => (c.dateApdReceived = v))}
            />
          </Cell>
          {content.milestones.map((m, i) => {
            const auto = isAuto("milestones");
            const set = (fn: (line: typeof m) => void) => update((c) => fn(c.milestones[i]));
            return (
              <MilestoneCells key={i}>
                <Cell col={[1, 1]} align="center" auto={auto}>
                  <TextInput value={m.wbs} readOnly={readOnly} align="center" onChange={(v) => set((l) => (l.wbs = v))} />
                </Cell>
                <Cell col={[2, 4]} auto={auto}>
                  <TextInput value={m.task} readOnly={readOnly} onChange={(v) => set((l) => (l.task = v))} />
                </Cell>
                <Cell col={[5, 5]} align="center" auto={auto}>
                  <PercentInput value={m.percent} readOnly={readOnly} onChange={(v) => set((l) => (l.percent = v))} />
                </Cell>
                <Cell col={[6, 6]} align="center" auto={auto}>
                  <DateInput value={m.original} readOnly={readOnly} onChange={(v) => set((l) => (l.original = v))} />
                </Cell>
                <Cell col={[7, 7]} align="center">
                  <DateInput value={m.approved} readOnly={readOnly} onChange={(v) => set((l) => (l.approved = v))} />
                </Cell>
                <Cell col={[8, 8]} align="center" auto={auto}>
                  <DateInput value={m.forecast} readOnly={readOnly} onChange={(v) => set((l) => (l.forecast = v))} />
                </Cell>
                <Cell col={[9, 12]} bold={/hold point/i.test(m.notes)} auto={auto}>
                  <TextInput value={m.notes} readOnly={readOnly} onChange={(v) => set((l) => (l.notes = v))} />
                </Cell>
              </MilestoneCells>
            );
          })}
          <Cell col={[1, 1]} />
          <Cell col={[2, 4]} bold>Project Completion</Cell>
          <Cell col={[5, 5]} align="center" bg={C.formula}>
            {d.completionPercent === null ? "" : `${Math.round(d.completionPercent)}%`}
          </Cell>
          <Cell col={[6, 6]} align="center">
            <DateInput
              value={content.completion.original}
              readOnly={readOnly}
              onChange={(v) => update((c) => (c.completion.original = v))}
            />
          </Cell>
          <Cell col={[7, 7]} align="center" auto={isAuto("completion.approved")}>
            <DateInput
              value={content.completion.approved}
              readOnly={readOnly}
              onChange={(v) => update((c) => (c.completion.approved = v))}
            />
          </Cell>
          <Cell col={[8, 8]} align="center" auto={isAuto("completion.forecast")}>
            <DateInput
              value={content.completion.forecast}
              readOnly={readOnly}
              onChange={(v) => update((c) => (c.completion.forecast = v))}
            />
          </Cell>
          <Cell col={[9, 12]}>
            <TextInput
              value={content.completion.notes}
              readOnly={readOnly}
              onChange={(v) => update((c) => (c.completion.notes = v))}
            />
          </Cell>
          <Spacer />

          <Section title="RELATED PROJECT DOCUMENTATION" />
          {label([1, 8], "Document Description:", { minH: 40 })}
          {label([9, 12], "Doc Reference:")}
          {content.documents.map((doc, i) => (
            <MilestoneCells key={`doc${i}`}>
              <Cell col={[1, 8]}>
                <TextInput
                  value={doc.description}
                  readOnly={readOnly}
                  onChange={(v) => update((c) => (c.documents[i].description = v))}
                />
              </Cell>
              <Cell col={[9, 12]}>
                <TextInput
                  value={doc.reference}
                  readOnly={readOnly}
                  onChange={(v) => update((c) => (c.documents[i].reference = v))}
                />
              </Cell>
            </MilestoneCells>
          ))}
        </div>
      </div>
    </div>
  );
}

// A fragment, so a row's cells stay direct children of the grid.
function MilestoneCells({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function RiskRow({
  category,
  health,
  comments,
  readOnly,
  auto,
  healthCell,
  onHealth,
  onComments,
}: {
  category: string;
  health: Health;
  comments: string;
  readOnly: boolean;
  auto: boolean;
  healthCell: (col: Span, value: Health, set: ((v: Health) => void) | undefined, auto?: boolean) => ReactNode;
  onHealth: (v: Health) => void;
  onComments: (v: string) => void;
}) {
  return (
    <>
      <Cell col={[2, 2]} bg={C.label} bold>{category}</Cell>
      {healthCell([3, 4], health, readOnly ? undefined : onHealth, auto)}
      <Cell col={[5, 6]} bg={C.label} bold>Comments:</Cell>
      <Cell col={[7, 12]} auto={auto}>
        <TextInput value={comments} readOnly={readOnly} onChange={onComments} />
      </Cell>
    </>
  );
}
