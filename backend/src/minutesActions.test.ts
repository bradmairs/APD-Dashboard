import { describe, expect, it } from "vitest";
import { extractActionRows, isClosedStatus, ownerMatches, parseDueDate, parseTables } from "./minutesActions";

// Shaped like mammoth's output for a typical minutes document: a details
// table, an attendees table, then the action register.
const HTML = `
<table><tr><td><p>Date</p></td><td><p>4 November 2026</p></td></tr></table>
<h2>Attendees</h2>
<table><tr><td><p>Name</p></td><td><p>Role</p></td></tr>
<tr><td><p>Alex Turner</p></td><td><p>PM</p></td></tr></table>
<h2>Action Register</h2>
<table>
<thead><tr><th><p>No.</p></th><th><p>Action</p></th><th><p>Owner</p></th><th><p>Due</p></th><th><p>Status</p></th></tr></thead>
<tbody>
<tr><td><p>1</p></td><td><p>Obtain the final cost estimates &amp; report.</p></td><td><p>Alex Turner</p></td><td><p>5 Nov 2026</p></td><td><p>Open</p></td></tr>
<tr><td><p>2</p></td><td><p>Confirm the financial delegation.</p></td><td><p>Sam Lee</p></td><td><p>TBC</p></td><td><p>Open</p></td></tr>
<tr><td><p>3</p></td><td><p>Brief the steering group.</p></td><td><p>Alex / Sam</p></td><td><p>12/11/2026</p></td><td><p>Open</p></td></tr>
<tr><td><p>4</p></td><td><p>Old item.</p></td><td><p>AT</p></td><td><p></p></td><td><p>Closed</p></td></tr>
</tbody></table>`;

describe("extractActionRows", () => {
  it("finds the action table by its headers and reads every row", () => {
    const rows = extractActionRows(HTML);
    expect(rows.map((r) => [r.action, r.owner, r.due, r.status])).toEqual([
      ["Obtain the final cost estimates & report.", "Alex Turner", "5 Nov 2026", "Open"],
      ["Confirm the financial delegation.", "Sam Lee", "TBC", "Open"],
      ["Brief the steering group.", "Alex / Sam", "12/11/2026", "Open"],
      ["Old item.", "AT", "", "Closed"],
    ]);
  });

  it("handles other header wordings and column orders", () => {
    const html = `<table><tr><td>Item</td><td>Responsible</td><td>Action Required</td><td>By When</td></tr>
      <tr><td>1.1</td><td>B. Mairs</td><td>Issue RFI</td><td>1/12/26</td></tr></table>`;
    expect(extractActionRows(html)).toEqual([
      { action: "Issue RFI", owner: "B. Mairs", due: "1/12/26", status: "" },
    ]);
  });

  it("ignores tables without an action and owner column", () => {
    expect(extractActionRows(`<table><tr><td>Name</td><td>Role</td></tr><tr><td>A</td><td>B</td></tr></table>`)).toEqual([]);
  });

  it("does not mix a nested table's rows into the outer table", () => {
    const tables = parseTables(`<table><tr><td>a<table><tr><td>x</td></tr></table></td><td>b</td></tr></table>`);
    expect(tables).toEqual([[["x"]], [["ax", "b"]]]);
  });
});

describe("ownerMatches", () => {
  const pm = ["Alex Turner"];
  const all = ["Alex Turner", "Sam Lee", "Alex / Sam", "AT"];
  it("matches the full name, initials, short forms and shared rows", () => {
    for (const owner of ["Alex Turner", "alex turner (CMP)", "AT", "A Turner", "A. Turner", "Alex T", "Turner", "Alex / Sam", "Sam, Alex Turner"]) {
      expect(ownerMatches(owner, pm, all), owner).toBe(true);
    }
  });
  it("does not match other people", () => {
    for (const owner of ["Sam Lee", "GVW", "", "Alexandra Smith"]) {
      expect(ownerMatches(owner, pm, all), owner).toBe(false);
    }
  });
  it("won't match a bare first name shared with another owner", () => {
    expect(ownerMatches("Alex", pm, ["Alex Turner", "Alex Brown"])).toBe(false);
  });
});

describe("parseDueDate", () => {
  it("reads common formats as Australian dates", () => {
    expect(parseDueDate("5 Nov 2026")?.toISOString().slice(0, 10)).toBe("2026-11-05");
    expect(parseDueDate("Friday 5th November 2026")?.toISOString().slice(0, 10)).toBe("2026-11-05");
    expect(parseDueDate("05/11/2026")?.toISOString().slice(0, 10)).toBe("2026-11-05");
    expect(parseDueDate("1/12/26")?.toISOString().slice(0, 10)).toBe("2026-12-01");
    expect(parseDueDate("2026-11-05")?.toISOString().slice(0, 10)).toBe("2026-11-05");
  });
  it("treats anything else as no due date", () => {
    for (const t of ["TBC", "ASAP", "Ongoing", "", "31/02/2026"]) expect(parseDueDate(t), t).toBeNull();
  });
});

describe("isClosedStatus", () => {
  it("recognises finished actions", () => {
    expect(isClosedStatus("Closed")).toBe(true);
    expect(isClosedStatus(" complete ")).toBe(true);
    expect(isClosedStatus("Open")).toBe(false);
  });
});
