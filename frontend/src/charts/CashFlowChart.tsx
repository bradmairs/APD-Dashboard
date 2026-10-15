import { CashFlowEntry } from "../types";
import { formatCurrency, formatReportMonth } from "../format";
import { useTheme } from "../theme/ThemeContext";
import {
  CASH_FLOW_ACTUAL,
  CASH_FLOW_FORECAST,
  CHART_BASELINE,
  CHART_TEXT_MUTED,
  CHART_TEXT_SECONDARY,
  chartColor,
} from "./palette";

const CHART_HEIGHT = 140;
const COLUMN_WIDTH = 44;

function monthLabel(value: string): string {
  return new Date(value).toLocaleDateString("en-AU", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function Legend({ theme }: { theme: "light" | "dark" }) {
  return (
    <div
      className="flex items-center gap-4 mb-3 text-xs"
      style={{ color: chartColor(CHART_TEXT_SECONDARY, theme) }}
    >
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block w-3 h-3 rounded-sm"
          style={{ backgroundColor: chartColor(CASH_FLOW_ACTUAL, theme) }}
        />
        Actual
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block w-3 h-3 rounded-sm"
          style={{ backgroundColor: chartColor(CASH_FLOW_FORECAST, theme) }}
        />
        Forecast
      </span>
    </div>
  );
}

// Vertical grouped bar chart — months read left to right as a timeline, which
// a horizontal bar (this codebase's default for magnitude comparisons) can't
// convey. Two categorical bars per month rather than a stacked total, since
// Actual and Forecast are alternatives for the same month, not parts of one sum.
export default function CashFlowChart({ entries }: { entries: CashFlowEntry[] }) {
  const { theme } = useTheme();

  if (entries.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
        No cash flow entries yet.
      </p>
    );
  }

  const months = Array.from(new Set(entries.map((e) => e.month))).sort();
  const byMonth = new Map<string, { actual?: number; forecast?: number }>();
  for (const month of months) byMonth.set(month, {});
  for (const entry of entries) {
    const bucket = byMonth.get(entry.month)!;
    if (entry.type === "ACTUAL") bucket.actual = Number(entry.amount);
    else bucket.forecast = Number(entry.amount);
  }

  const maxValue = Math.max(...entries.map((e) => Number(e.amount)), 1);

  return (
    <div>
      <Legend theme={theme} />
      <div className="overflow-x-auto">
        <div
          className="flex items-end gap-3"
          style={{ minWidth: months.length * COLUMN_WIDTH }}
        >
          {months.map((month) => {
            const { actual, forecast } = byMonth.get(month)!;
            return (
              <div
                key={month}
                className="flex flex-col items-center shrink-0"
                style={{ width: COLUMN_WIDTH - 12 }}
              >
                <div
                  className="flex items-end gap-1"
                  style={{
                    height: CHART_HEIGHT,
                    borderBottom: `1px solid ${chartColor(CHART_BASELINE, theme)}`,
                  }}
                >
                  {actual !== undefined && (
                    <div
                      tabIndex={0}
                      className="w-3.5 rounded-t transition-opacity hover:opacity-80 focus:opacity-80"
                      style={{
                        height: `${Math.max((actual / maxValue) * 100, 2)}%`,
                        backgroundColor: chartColor(CASH_FLOW_ACTUAL, theme),
                      }}
                      title={`Actual, ${formatReportMonth(month)}: ${formatCurrency(actual)}`}
                    />
                  )}
                  {forecast !== undefined && (
                    <div
                      tabIndex={0}
                      className="w-3.5 rounded-t transition-opacity hover:opacity-80 focus:opacity-80"
                      style={{
                        height: `${Math.max((forecast / maxValue) * 100, 2)}%`,
                        backgroundColor: chartColor(CASH_FLOW_FORECAST, theme),
                      }}
                      title={`Forecast, ${formatReportMonth(month)}: ${formatCurrency(forecast)}`}
                    />
                  )}
                </div>
                <span
                  className="text-[10px] mt-1 whitespace-nowrap"
                  style={{ color: chartColor(CHART_TEXT_MUTED, theme) }}
                >
                  {monthLabel(month)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs pt-2" style={{ color: chartColor(CHART_TEXT_MUTED, theme) }}>
        Bar height is relative to the largest single month shown ({formatCurrency(maxValue)}).
      </p>
    </div>
  );
}
