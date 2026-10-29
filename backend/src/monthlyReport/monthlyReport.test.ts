import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { derive, emptyContent, fiscalIndex, fyLabel, fyStartYear, normalizeContent } from "./model";
import { readReportWorkbook, setCell, toReportingMonth, writeReportWorkbook } from "./workbook";
import { buildAutofill, AutofillData } from "./autofill";
import { decrypt, encrypt, matchScore, shareId } from "../sharepoint";

// A cut-down monthly report workbook: the three tabs the sync touches, a
// Reporting Log table, a VBA part and a calcChain — enough to check the
// writer edits cells in place and leaves the rest of the package alone.
async function fixture(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml",
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Override PartName="/xl/calcChain.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.calcChain+xml"/></Types>');
  zip.file("xl/workbook.xml",
    '<workbook><sheets><sheet name="Monthly Report" sheetId="1" r:id="rId1"/>' +
    '<sheet name="Snapshot" sheetId="2" r:id="rId2"/><sheet name="Reporting Log" sheetId="3" r:id="rId3"/></sheets>' +
    '<calcPr calcId="191029"/></workbook>');
  zip.file("xl/_rels/workbook.xml.rels",
    '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Target="worksheets/sheet3.xml"/>' +
    '<Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/calcChain" Target="calcChain.xml"/></Relationships>');
  zip.file("xl/sharedStrings.xml",
    '<sst><si><t>Old Project</t></si><si><t>September 2026</t></si><si><r><t>Yel</t></r><r><t>low</t></r></si>' +
    '<si><t>Procurement</t></si><si><t>Project Name:</t></si><si><t>Reporting Month:</t></si>' +
    '<si><t>Emerging Risk Health  Comments:</t></si><si><t>Current Year - July</t></si><si><t>Spare Reporting 1 Value</t></si></sst>');
  zip.file("xl/worksheets/sheet1.xml",
    '<worksheet><dimension ref="B1:M78"/><sheetData>' +
    '<row r="7"><c r="B7" s="3"><v>4</v></c><c r="D7" s="5" t="s"><v>0</v></c><c r="E7" s="5"/></row>' +
    '<row r="14"><c r="D14" s="5" t="s"><v>1</v></c></row>' +
    '<row r="27"><c r="D27" s="7" t="s"><v>2</v></c><c r="H27" s="5" t="inlineStr"><is><t>Lining TBD</t></is></c></row>' +
    '<row r="47"><c r="B47" s="9"><v>1000</v></c><c r="H47" s="9"><f>100+200</f><v>300</v></c></row>' +
    '<row r="51"><c r="B51" s="9"><v>10</v></c><c r="C51" s="9"><v>20</v></c></row>' +
    '<row r="65"><c r="F65" s="11"><v>0.5</v></c><c r="G65" s="12"><v>46357</v></c><c r="H65" s="12" t="inlineStr"><is><t>-</t></is></c></row>' +
    '</sheetData></worksheet>');
  zip.file("xl/worksheets/sheet2.xml",
    '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>4</v></c><c r="B1" t="s"><v>8</v></c></row>' +
    '<row r="2"><c r="A2" t="str"><f>x</f><v>Old Project</v></c><c r="B2" t="str"><f>y</f><v>Spare 1</v></c></row></sheetData></worksheet>');
  zip.file("xl/worksheets/sheet3.xml",
    '<worksheet><dimension ref="A1:D2"/><sheetData>' +
    '<row r="1"><c r="A1" t="s"><v>4</v></c><c r="B1" t="s"><v>5</v></c><c r="C1" t="s"><v>6</v></c><c r="D1" t="s"><v>7</v></c></row>' +
    '<row r="2"><c r="A2" s="20" t="s"><v>0</v></c><c r="B2" s="21"><v>46204</v></c>' +
    '<c r="C2" s="20" t="inlineStr"><is><t>Yellow --- Procurement Risk --- Lining TBD</t></is></c><c r="D2" s="22"><v>55</v></c></row>' +
    '</sheetData></worksheet>');
  zip.file("xl/worksheets/_rels/sheet3.xml.rels",
    '<Relationships><Relationship Id="rId1" Target="../tables/table1.xml"/></Relationships>');
  zip.file("xl/tables/table1.xml", '<table name="tblReportingLog" ref="A1:D2"><autoFilter ref="A1:D2"/></table>');
  zip.file("xl/calcChain.xml", "<calcChain/>");
  zip.file("xl/vbaProject.bin", "VBA-BYTES");
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("financial year helpers", () => {
  it("works out the FY and fiscal month", () => {
    expect(fyStartYear("2026-09")).toBe(2026);
    expect(fyStartYear("2027-03")).toBe(2026);
    expect(fiscalIndex("2026-07")).toBe(0);
    expect(fiscalIndex("2027-06")).toBe(11);
    expect(fyLabel(2026)).toBe("FY 2026/27");
  });
});

describe("derive (the sheet's formula cells)", () => {
  it("matches the template's formulas", () => {
    const c = emptyContent();
    c.approvedBudget = 3195000;
    c.preFyActual = 209224.07;
    c.currentFyMonths = [0, 9535.75, 57821.33, 75000, 75000, 50000, 3000, 3000, 50000, 50000, 50000, 50000];
    c.nextFyMonths = [75000, 75000, 75000, 75000, 3000, 3000, 3000, 3000, 3000, 100000, 100000, 100000];
    c.fy2Forecast = 3864425.85;
    c.corporatePlanApproved = 0;
    c.risks[5] = { category: "Procurement", health: "Yellow", comments: "Lining TBD" };
    c.milestones.forEach((m, i) => (m.percent = [100, 50, 0, 0, 0, 0][i]));
    const d = derive(c, "2026-09");
    expect(d.monthKinds.slice(0, 4)).toEqual(["Actual", "Actual", "Actual", "Forecast"]);
    expect(d.expenditureToDate).toBeCloseTo(276581.15, 2);
    expect(d.forecastTotal).toBeCloseTo(5162007, 2);
    expect(d.variance).toBeCloseTo(-1967007, 2);
    expect(d.fyForecastTotal).toBeCloseTo(473357.08, 2);
    expect(d.emergingRiskHealth).toBe("Yellow");
    expect(d.emergingRiskComments).toBe("Yellow --- Procurement Risk --- Lining TBD");
    expect(d.completionPercent).toBe(25);
    expect(d.fyLabels.post).toBe("Post FY 2029/30");
  });

  it("normalizes junk input into a complete document", () => {
    const c = normalizeContent({ projectName: 5, currentFyMonths: ["12", "x"], risks: [{ category: "Safety", health: "Red" }] });
    expect(c.projectName).toBe("5");
    expect(c.currentFyMonths.slice(0, 2)).toEqual([12, null]);
    expect(c.currentFyMonths).toHaveLength(12);
    expect(c.risks[0].health).toBe("Red");
    expect(c.risks[1].health).toBe("Green");
  });
});

describe("workbook", () => {
  it("parses month labels", () => {
    expect(toReportingMonth("September 2026")).toBe("2026-09");
    expect(toReportingMonth(46204)).toBe("2026-07");
    expect(toReportingMonth("nope")).toBeNull();
  });

  it("reads the report tab and the log", async () => {
    const parsed = await readReportWorkbook(await fixture());
    expect(parsed.current?.reportingMonth).toBe("2026-09");
    expect(parsed.current?.content.projectName).toBe("Old Project");
    expect(parsed.current?.content.risks[5]).toEqual({ category: "Procurement", health: "Yellow", comments: "Lining TBD" });
    expect(parsed.current?.content.milestones[1].percent).toBe(50);
    expect(parsed.current?.content.milestones[1].original).toBe("2026-12-01");
    expect(parsed.current?.content.fy2Forecast).toBe(300);
    expect(parsed.log.map((l) => l.reportingMonth)).toEqual(["2026-07"]);
    expect(parsed.log[0].content.risks[5].health).toBe("Yellow");
    expect(parsed.log[0].content.currentFyMonths[0]).toBe(55);
  });

  it("writes inputs in place and leaves the rest of the package alone", async () => {
    const src = await fixture();
    const parsed = await readReportWorkbook(src);
    const content = structuredClone(parsed.current!.content);
    content.projectName = "New $& <Name>";
    content.recentlyCompleted = "•Line one\n•Line two";
    const out = await writeReportWorkbook(src, "2026-10", content, { log: true });
    expect(out.logged).toBe("appended");

    const zip = await JSZip.loadAsync(out.buffer);
    const sheet = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
    expect(sheet).toContain('<c r="D7" s="5" t="inlineStr"><is><t xml:space="preserve">New $&amp; &lt;Name&gt;</t></is></c>');
    // An unchanged cell keeps the PM's own formula.
    expect(sheet).toContain("<f>100+200</f>");
    // The "-" placeholder in a date cell isn't blanked.
    expect(sheet).toContain('<c r="H65" s="12" t="inlineStr"><is><t>-</t></is></c>');
    // B18 didn't exist; it's inserted into a new row in order.
    expect(sheet.indexOf('<row r="18">')).toBeGreaterThan(sheet.indexOf('<row r="14">'));
    expect(sheet.indexOf('<row r="18">')).toBeLessThan(sheet.indexOf('<row r="27">'));
    expect(await zip.file("xl/vbaProject.bin")!.async("string")).toBe("VBA-BYTES");
    expect(zip.file("xl/calcChain.xml")).toBeNull();
    expect(await zip.file("xl/workbook.xml")!.async("string")).toContain('fullCalcOnLoad="1"');
    expect(await zip.file("xl/tables/table1.xml")!.async("string")).toBe(
      '<table name="tblReportingLog" ref="A1:D3"><autoFilter ref="A1:D3"/></table>');

    const back = await readReportWorkbook(out.buffer);
    expect(back.current?.reportingMonth).toBe("2026-10");
    expect(back.current?.content.projectName).toBe("New $& <Name>");
    expect(back.current?.content.recentlyCompleted).toBe("•Line one\n•Line two");
    expect(back.log.map((l) => l.reportingMonth)).toEqual(["2026-07", "2026-10"]);
    const log = await zip.file("xl/worksheets/sheet3.xml")!.async("string");
    // New log row copies the formats of the row above.
    expect(log).toContain('<c r="A3" s="20" t="inlineStr">');

    // Logging the same month again replaces its row.
    const again = await writeReportWorkbook(out.buffer, "2026-10", content, { log: true });
    expect(again.logged).toBe("replaced");
    expect(again.cellsChanged).toBe(0);
    expect((await readReportWorkbook(again.buffer)).log).toHaveLength(2);
  });

  it("changes nothing when nothing changed", async () => {
    const src = await fixture();
    const parsed = await readReportWorkbook(src);
    const out = await writeReportWorkbook(src, parsed.current!.reportingMonth, parsed.current!.content);
    expect(out.cellsChanged).toBe(0);
  });

  it("inserts a cell into an existing row in column order", () => {
    const xml = '<sheetData><row r="7"><c r="B7"/><c r="E7"/></row></sheetData>';
    expect(setCell(xml, "D7", 1)).toBe('<sheetData><row r="7"><c r="B7"/><c r="D7"><v>1</v></c><c r="E7"/></row></sheetData>');
    expect(setCell('<sheetData><row r="3"></row></sheetData>', "A3", "x")).toBe(
      '<sheetData><row r="3"><c r="A3" t="inlineStr"><is><t xml:space="preserve">x</t></is></c></row></sheetData>');
  });

  it("rejects files that aren't the report workbook", async () => {
    await expect(readReportWorkbook(Buffer.from("not a zip"))).rejects.toThrow(/isn't an Excel workbook/);
  });
});

describe("autofill", () => {
  const base: AutofillData = {
    project: {
      name: "SPS02 Upgrade", status: "DESIGN", bpRefNo: "3321", projectNumber: "301079",
      projectManager: "Brad Mairs", projectDirector: "A. Director", projectSponsor: "R. Sponsor",
      budget: 1000000, latestApprovedBudget: 1200000,
      startDate: new Date("2025-09-01"), targetCompletionDate: new Date("2028-06-01"), actualCompletionDate: null,
    },
    milestones: [
      { wbsItem: "1", taskActivity: "Design Consultancy Award", percentComplete: 100, originalCompletion: new Date("2026-06-01"),
        forecastedCompletion: null, actualCompletion: new Date("2026-09-04"), notes: null },
      { wbsItem: "2", taskActivity: "Concept Design", percentComplete: 50, originalCompletion: new Date("2026-12-01"),
        forecastedCompletion: new Date("2026-10-20"), actualCompletion: null, notes: "Hold point" },
    ],
    cashFlow: [
      { month: new Date("2026-05-01"), type: "ACTUAL", amount: 5000 },
      { month: new Date("2026-08-01"), type: "ACTUAL", amount: 100 },
      { month: new Date("2026-08-01"), type: "FORECAST", amount: 999 },
      { month: new Date("2026-11-01"), type: "FORECAST", amount: 200 },
      { month: new Date("2027-07-01"), type: "FORECAST", amount: 300 },
      { month: new Date("2028-07-01"), type: "FORECAST", amount: 400 },
    ],
    risks: [
      { type: "RISK", title: "Geotech unknown", category: "Technical", status: "OPEN",
        inherentLikelihood: "LIKELY", inherentConsequence: "MODERATE", residualLikelihood: null, residualConsequence: null },
      { type: "RISK", title: "Closed one", category: "Safety", status: "CLOSED",
        inherentLikelihood: "ALMOST_CERTAIN", inherentConsequence: "SEVERE", residualLikelihood: null, residualConsequence: null },
    ],
    tasks: [
      { title: "Issue concept review minutes", status: "DONE", dueDate: null, updatedAt: new Date("2026-09-20") },
      { title: "Book TBL workshop", status: "TODO", dueDate: new Date("2026-10-10"), updatedAt: new Date("2026-09-01") },
    ],
  };

  it("fills a first report from the project", () => {
    const { content, autoFields } = buildAutofill(base, "2026-09", null);
    expect(content.projectName).toBe("SPS02 Upgrade");
    expect(content.projectPhase).toBe("3 - Plan");
    expect(content.currentStatus).toBe("Concept Design");
    expect(content.recentlyCompleted).toBe("•Design Consultancy Award completed on 04/09/2026.\n•Issue concept review minutes.");
    expect(content.monthlyLookahead).toContain("•Concept Design forecast to complete by 20/10/2026.");
    expect(content.monthlyLookahead).toContain("•Book TBL workshop (due 10/10/2026).");
    expect(content.risks.find((r) => r.category === "Technical")).toEqual({ category: "Technical", health: "Red", comments: "Geotech unknown" });
    expect(content.risks.find((r) => r.category === "Safety")?.health).toBe("Green");
    expect(content.approvedBudget).toBe(1200000);
    expect(content.preFyActual).toBe(5000);
    expect(content.currentFyMonths[1]).toBe(100); // August: actual beats forecast
    expect(content.currentFyMonths[4]).toBe(200);
    expect(content.nextFyMonths[0]).toBe(300);
    expect(content.fy2Forecast).toBe(400);
    expect(content.milestones[1]).toMatchObject({ task: "Concept Design", percent: 50, original: "2026-12-01", forecast: "2026-10-20" });
    expect(content.completion.approved).toBe("2028-06-01");
    expect(content.dateApdReceived).toBe("2025-09-01");
    expect(autoFields).toContain("milestones");
  });

  it("carries forward what the dashboard doesn't track", () => {
    const prev = emptyContent();
    prev.projectDirectorTitle = "Manager - APD";
    prev.businessCaseDoc = "DOC21/1";
    prev.milestones[1] = { wbs: "2", task: "Concept Design", percent: 40, original: "2026-12-01", approved: "2027-01-01", forecast: null, notes: "-" };
    const { content } = buildAutofill(base, "2026-10", prev);
    expect(content.projectDirectorTitle).toBe("Manager - APD");
    expect(content.businessCaseDoc).toBe("DOC21/1");
    expect(content.milestones[1].approved).toBe("2027-01-01");
    expect(content.milestones[1].percent).toBe(50);
  });
});

describe("sharepoint helpers", () => {
  it("encodes share ids the way Graph expects", () => {
    expect(shareId("https://contoso.sharepoint.com/a?b=c")).toBe("u!aHR0cHM6Ly9jb250b3NvLnNoYXJlcG9pbnQuY29tL2E_Yj1j");
  });

  it("round-trips encrypted tokens", () => {
    process.env.JWT_SECRET = "test-secret";
    expect(decrypt(encrypt("refresh-token"))).toBe("refresh-token");
  });

  it("matches workbooks by project number first", () => {
    const p = { name: "SPS02 and SPS07 Dry Well Conversion", projectNumber: "301079", bpRefNo: "3321" };
    const good = matchScore("Brad Mairs - Monthly Report - 301079 & 301080 SPS02 and SPS07 Dry Well.xlsm", p);
    const other = matchScore("Jo Smith - Monthly Report - 301500 Reservoir Roof.xlsm", p);
    expect(good).toBeGreaterThanOrEqual(10);
    expect(other).toBeLessThan(10);
  });
});
