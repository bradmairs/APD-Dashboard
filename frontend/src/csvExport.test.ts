import { describe, expect, it } from "vitest";
import { autoCsv, toCsv } from "./csvExport";

describe("toCsv", () => {
  const columns = [{ header: "Name", key: "name" }, { header: "Amount", key: "amount" }];

  it("prefixes a BOM and quotes commas, quotes and newlines", () => {
    const csv = toCsv(columns, [{ name: 'Smith, "Bob"\nJr', amount: "5" }]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"Smith, ""Bob""\nJr"');
  });

  it("neutralises spreadsheet formulas but leaves negative amounts alone", () => {
    const csv = toCsv(columns, [{ name: "=HYPERLINK(\"x\")", amount: "-$23,696" }]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("-$23,696");
    expect(csv).not.toContain("'-$23,696");
  });
});

describe("autoCsv", () => {
  it("derives humanised columns, formats dates and enums, and hides internal keys", () => {
    const { columns, rows } = autoCsv([
      { id: "1", projectId: "p", title: "Pump", dueDate: "2026-03-04T00:00:00.000Z", status: "IN_PROGRESS", nested: { a: 1 }, notes: null },
    ]);
    expect(columns.map((c) => c.header)).toEqual(["Title", "Due Date", "Status", "Notes"]);
    expect(rows[0]).toMatchObject({ title: "Pump", dueDate: "2026-03-04", status: "In progress" });
  });
});
