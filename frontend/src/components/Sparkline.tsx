import { useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { CHART_TEXT_MUTED, SEQUENTIAL_BLUE, chartColor } from "../charts/palette";

export interface SparkPoint {
  label: string;
  value: number;
}

// A small trend line for a stat tile: the series in the quiet hue, the
// latest point in the accent, and a hover readout per point (the tile's
// label names the series, so there's no legend).
export default function Sparkline({
  points,
  format,
  height = 32,
  ariaLabel,
}: {
  points: SparkPoint[];
  format: (v: number) => string;
  height?: number;
  ariaLabel: string;
}) {
  const { theme } = useTheme();
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return null;
  const width = 120;
  const pad = 4;
  const max = Math.max(...points.map((p) => p.value));
  const min = Math.min(...points.map((p) => p.value));
  const span = max - min || 1;
  const x = (i: number) => pad + (i * (width - pad * 2)) / (points.length - 1);
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const last = points.length - 1;
  const accent = chartColor(SEQUENTIAL_BLUE, theme);
  const quiet = chartColor(CHART_TEXT_MUTED, theme);
  const shown = hover ?? last;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel}
        className="overflow-visible"
        onMouseLeave={() => setHover(null)}
      >
        <path d={path} fill="none" stroke={quiet} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.7} />
        <circle cx={x(shown)} cy={y(points[shown].value)} r={3.5} fill={accent} stroke="currentColor" strokeWidth={0} />
        {/* Hit areas wider than the marks. */}
        {points.map((p, i) => (
          <rect
            key={i}
            x={x(i) - (width - pad * 2) / (points.length - 1) / 2}
            y={0}
            width={(width - pad * 2) / (points.length - 1)}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>
      {hover !== null && (
        <div className="absolute right-0 -top-7 whitespace-nowrap rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-[11px] px-1.5 py-0.5 pointer-events-none shadow">
          {points[hover].label}: {format(points[hover].value)}
        </div>
      )}
    </div>
  );
}
