import { formatCurrency } from "../format";
import { useTheme } from "../theme/ThemeContext";
import {
  CASH_FLOW_ACTUAL,
  CASH_FLOW_FORECAST,
  ChartToken,
  CHART_BASELINE,
  CHART_GRIDLINE,
  CHART_TEXT_MUTED,
  CHART_TEXT_SECONDARY,
  chartColor,
} from "./palette";
import { formatCompact, monthLabel } from "./cumulativeSpend";

const WIDTH = 800;
const HEIGHT = 260;
const PAD_LEFT = 64;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 30;
const PLOT_WIDTH = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = HEIGHT - PAD_TOP - PAD_BOTTOM;

export interface BudgetLine {
  value: number;
  label: string;
  color: ChartToken;
}

interface Props {
  months: string[];
  cumulative: number[];
  lastActualIndex: number;
  budgetLines: BudgetLine[];
  footerNote: string;
}

// The shared S-curve renderer behind both the per-project and portfolio
// cumulative-spend charts — everything project-specific (which entries feed
// in, how many projects' budgets are summed) is resolved by the caller into
// this one series-plus-budget-lines shape first. budgetLines is usually one
// or two reference lines (Original Budget, Latest Approved Budget) — each
// caller decides its own color and label, so the two can be told apart when
// both are plotted together.
export default function CumulativeSpendChartView({
  months,
  cumulative,
  lastActualIndex,
  budgetLines,
  footerNote,
}: Props) {
  const { theme } = useTheme();

  const maxValue =
    Math.max(
      ...budgetLines.map((b) => b.value),
      cumulative[cumulative.length - 1] ?? 0,
      1
    ) * 1.1;

  const x = (i: number) =>
    PAD_LEFT + (months.length > 1 ? (i / (months.length - 1)) * PLOT_WIDTH : 0);
  const y = (v: number) => PAD_TOP + (1 - v / maxValue) * PLOT_HEIGHT;

  const actualPath = cumulative
    .slice(0, Math.max(lastActualIndex, 0) + 1)
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`)
    .join(" ");
  const forecastPath =
    lastActualIndex < months.length - 1
      ? cumulative
          .slice(Math.max(lastActualIndex, 0))
          .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i + Math.max(lastActualIndex, 0))} ${y(v)}`)
          .join(" ")
      : null;

  const todayKey = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)
  ).toISOString();
  const todayIndex = months.indexOf(todayKey);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxValue);
  const labelEvery = Math.max(1, Math.ceil(months.length / 8));

  return (
    <div>
      <div
        className="flex items-center gap-4 mb-3 text-xs flex-wrap"
        style={{ color: chartColor(CHART_TEXT_SECONDARY, theme) }}
      >
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-0.5"
            style={{ backgroundColor: chartColor(CASH_FLOW_ACTUAL, theme) }}
          />
          Actual (cumulative)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-0.5 border-t-2 border-dashed"
            style={{ borderColor: chartColor(CASH_FLOW_FORECAST, theme) }}
          />
          Forecast (cumulative)
        </span>
        {budgetLines.map((line) => (
          <span key={line.label} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-0.5 border-t-2 border-dashed"
              style={{ borderColor: chartColor(line.color, theme) }}
            />
            {line.label}
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto">
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={y(tick)}
              y2={y(tick)}
              stroke={chartColor(CHART_GRIDLINE, theme)}
              strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 8}
              y={y(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              fill={chartColor(CHART_TEXT_MUTED, theme)}
            >
              {formatCompact(tick)}
            </text>
          </g>
        ))}

        <line
          x1={PAD_LEFT}
          x2={WIDTH - PAD_RIGHT}
          y1={PAD_TOP + PLOT_HEIGHT}
          y2={PAD_TOP + PLOT_HEIGHT}
          stroke={chartColor(CHART_BASELINE, theme)}
          strokeWidth={1}
        />

        {months.map((month, i) =>
          i % labelEvery === 0 ? (
            <text
              key={month}
              x={x(i)}
              y={HEIGHT - 8}
              textAnchor="middle"
              fontSize={10}
              fill={chartColor(CHART_TEXT_MUTED, theme)}
            >
              {monthLabel(month)}
            </text>
          ) : null
        )}

        {budgetLines.map((line) => (
          <line
            key={line.label}
            x1={PAD_LEFT}
            x2={WIDTH - PAD_RIGHT}
            y1={y(line.value)}
            y2={y(line.value)}
            stroke={chartColor(line.color, theme)}
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        ))}

        {todayIndex >= 0 && (
          <>
            <line
              x1={x(todayIndex)}
              x2={x(todayIndex)}
              y1={PAD_TOP}
              y2={PAD_TOP + PLOT_HEIGHT}
              stroke={chartColor(CHART_TEXT_SECONDARY, theme)}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text
              x={x(todayIndex)}
              y={PAD_TOP - 4}
              textAnchor="middle"
              fontSize={10}
              fill={chartColor(CHART_TEXT_SECONDARY, theme)}
            >
              Today
            </text>
          </>
        )}

        {forecastPath && (
          <path
            d={forecastPath}
            fill="none"
            stroke={chartColor(CASH_FLOW_FORECAST, theme)}
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        )}
        {actualPath && (
          <path
            d={actualPath}
            fill="none"
            stroke={chartColor(CASH_FLOW_ACTUAL, theme)}
            strokeWidth={2}
          />
        )}

        {cumulative.map((v, i) => (
          <circle
            key={months[i]}
            cx={x(i)}
            cy={y(v)}
            r={2.5}
            fill={chartColor(
              i <= lastActualIndex ? CASH_FLOW_ACTUAL : CASH_FLOW_FORECAST,
              theme
            )}
          >
            <title>
              {monthLabel(months[i])}: {formatCurrency(v)} cumulative
              {i <= lastActualIndex ? " (actual)" : " (forecast)"}
            </title>
          </circle>
        ))}
      </svg>

      <p className="text-xs pt-1" style={{ color: chartColor(CHART_TEXT_MUTED, theme) }}>
        {footerNote}
      </p>
    </div>
  );
}
