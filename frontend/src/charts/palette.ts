// Chart tokens, from the validated reference palette (see dataviz skill).
// Light and dark are both selected instances of the same palette — the dark
// column is the same hues stepped for the dark chart surface (#1a1a19), not
// a separate palette. See scripts/validate_palette.js runs in the dataviz
// skill for the CVD/contrast checks behind each pair below.

export const CHART_SURFACE = { light: "#fcfcfb", dark: "#1a1a19" };
export const CHART_TEXT_PRIMARY = { light: "#0b0b0b", dark: "#ffffff" };
export const CHART_TEXT_SECONDARY = { light: "#52514e", dark: "#c3c2b7" };
export const CHART_TEXT_MUTED = { light: "#898781", dark: "#898781" };
export const CHART_GRIDLINE = { light: "#e1e0d9", dark: "#2c2c2a" };
export const CHART_BASELINE = { light: "#c3c2b7", dark: "#383835" };

// Single-hue sequential blue (magnitude charts with one series).
export const SEQUENTIAL_BLUE = { light: "#2a78d6", dark: "#3987e5" };

// Task status progression — validated for CVD-safe adjacent separation
// (blue vs gray, blue vs green); gray intentionally reads as "neutral/not
// started" rather than as a categorical hue. Green is mode-invariant.
export const TASK_STATUS_COLORS: Record<
  "TODO" | "IN_PROGRESS" | "DONE",
  { light: string; dark: string }
> = {
  TODO: CHART_TEXT_MUTED,
  IN_PROGRESS: SEQUENTIAL_BLUE,
  DONE: { light: "#008300", dark: "#008300" },
};

// Actual vs. Forecast spend — categorical slots 1 (blue) and 2 (orange) from
// the reference palette, validated as a passing adjacent pair in both modes
// (light: CVD ΔE 24.7, normal-vision ΔE 33.6; dark, against the #1a1a19
// chart surface: CVD ΔE 26.8, normal-vision ΔE 31.8 — see dataviz skill).
export const CASH_FLOW_ACTUAL = SEQUENTIAL_BLUE;
export const CASH_FLOW_FORECAST = { light: "#eb6834", dark: "#d95926" };

// Budget reference lines on the Spend vs Budget chart: the Original Budget
// stays the existing neutral gray (CHART_TEXT_MUTED) since it never changes
// once set; the Latest Approved Budget gets its own green so the two are
// distinguishable when both are plotted at once — a deliberate departure
// from "thresholds are always neutral gray" since here there are two
// thresholds whose relationship (has the budget moved, and which way) is
// the point of showing them together.
export const BUDGET_LATEST_APPROVED = { light: "#3f9142", dark: "#5fbf62" };

export type ChartToken = { light: string; dark: string };

export function chartColor(token: ChartToken, theme: "light" | "dark"): string {
  return token[theme];
}
