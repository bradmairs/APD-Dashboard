import { describe, expect, it } from "vitest";
import { derive, emptyContent, monthLabel } from "./model";

// The frontend copy of the report model must calculate exactly like the
// workbook (and the backend original) — spot-check the formula cells.
describe("monthly report model (frontend copy)", () => {
  it("recalculates the formula cells", () => {
    const c = emptyContent();
    c.approvedBudget = 1000;
    c.preFyActual = 100;
    c.currentFyMonths[0] = 10; // July, actual in August
    c.currentFyMonths[1] = 20;
    c.currentFyMonths[2] = 30; // September, still forecast
    c.nextFyMonths[0] = 5;
    c.fy2Forecast = 7;
    c.risks[8] = { category: "Technical", health: "Red", comments: "Geotech" };
    const d = derive(c, "2026-08");
    expect(d.expenditureToDate).toBe(130);
    expect(d.currentFyForecastRemainder).toBe(30);
    expect(d.forecastTotal).toBe(172);
    expect(d.variance).toBe(828);
    expect(d.emergingRiskHealth).toBe("Red");
    expect(d.emergingRiskComments).toBe("Red --- Technical Risk --- Geotech");
    expect(monthLabel("2026-08")).toBe("August 2026");
  });
});
