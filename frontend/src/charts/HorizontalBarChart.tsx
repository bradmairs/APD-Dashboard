import { useTheme } from "../theme/ThemeContext";
import { CHART_BASELINE, CHART_TEXT_MUTED, CHART_TEXT_SECONDARY, chartColor } from "./palette";

export interface BarDatum {
  label: string;
  value: number;
}

interface Props {
  data: BarDatum[];
  color: string;
  formatValue: (value: number) => string;
  emptyMessage?: string;
}

// Horizontal single-series bar chart. Bars share one hue since the y-axis
// label already carries category identity — no legend needed for one series.
export default function HorizontalBarChart({
  data,
  color,
  formatValue,
  emptyMessage = "No data yet.",
}: Props) {
  const { theme } = useTheme();

  if (data.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
        {emptyMessage}
      </p>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((d) => {
        const widthPct = Math.max((d.value / maxValue) * 100, d.value > 0 ? 2 : 0);
        return (
          <div key={d.label} className="group" tabIndex={0}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-700 dark:text-slate-300">{d.label}</span>
              <span
                className="font-medium tabular-nums"
                style={{ color: chartColor(CHART_TEXT_SECONDARY, theme) }}
              >
                {formatValue(d.value)}
              </span>
            </div>
            <div
              className="h-4"
              style={{ borderBottom: `1px solid ${chartColor(CHART_BASELINE, theme)}` }}
            >
              <div
                className="h-4 transition-opacity group-hover:opacity-80 group-focus:opacity-80"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: color,
                  borderRadius: "0 4px 4px 0",
                  minWidth: d.value > 0 ? "4px" : 0,
                }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-xs pt-1" style={{ color: chartColor(CHART_TEXT_MUTED, theme) }}>
        Bar length is relative to the largest value shown ({formatValue(maxValue)}).
      </p>
    </div>
  );
}
