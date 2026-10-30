import { jsPDF } from "jspdf";
import { Inline, parseBlocks } from "./richText";
import { formatDate } from "./format";

interface MeetingMinutesPdfAction {
  title: string;
  ownerName: string | null;
  dueDateHint: string | null;
}

interface MeetingMinutesPdfInput {
  title: string | null;
  meetingDate: string;
  meetingType: string | null;
  location: string | null;
  attendees: string | null;
  summary: string | null;
  notes: string | null;
  actions: MeetingMinutesPdfAction[];
}

// A plain text-drawn PDF (not a screenshot of a DOM node, unlike
// pdfExport.ts's report export) — meeting minutes are just structured
// text, so drawing it directly with jsPDF gives a smaller, crisper,
// searchable file with no offscreen render step needed.
export function buildMeetingMinutesPdf(projectName: string, input: MeetingMinutesPdfInput): Blob {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const marginX = 18;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const maxWidth = pageWidth - marginX * 2;
  let y = 20;

  function ensureSpace(lines: number, lineHeight = 6) {
    if (y + lines * lineHeight > pageHeight - 20) {
      pdf.addPage();
      y = 20;
    }
  }

  function heading(text: string) {
    ensureSpace(2, 8);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(text, marginX, y);
    y += 7;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
  }

  function paragraph(text: string) {
    const lines = pdf.splitTextToSize(text, maxWidth) as string[];
    ensureSpace(lines.length);
    pdf.text(lines, marginX, y);
    y += lines.length * 5 + 3;
  }

  // Draws formatted text (see richText.ts) with its bold, italic and
  // underlined runs and its bullet/numbered lists, wrapping words to the
  // page width with a hanging indent for list items.
  const LINE_HEIGHT = 5;
  const LIST_INDENT = 6;

  interface Run {
    text: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
  }

  function flatten(nodes: Inline[], style: Omit<Run, "text">, out: Run[] = []): Run[] {
    for (const node of nodes) {
      if (node.type === "text") out.push({ ...style, text: node.text });
      else flatten(node.children, { ...style, [node.type]: true }, out);
    }
    return out;
  }

  function setRunFont(run: Omit<Run, "text">) {
    const variant =
      run.bold && run.italic ? "bolditalic" : run.bold ? "bold" : run.italic ? "italic" : "normal";
    pdf.setFont("helvetica", variant);
  }

  function drawRuns(runs: Run[], left: number, firstLinePrefix?: string) {
    const right = marginX + maxWidth;
    ensureSpace(1, LINE_HEIGHT);
    if (firstLinePrefix) {
      pdf.setFont("helvetica", "normal");
      pdf.text(firstLinePrefix, marginX + 1, y);
    }
    let x = left;
    let lineHasText = false;
    // Where the current underlined phrase started, so the spaces between
    // its words are underlined too.
    let underlineStart: number | null = null;
    // Words keep their trailing spaces; each is drawn in its run's style.
    const tokens = runs.flatMap((run) =>
      (run.text.match(/\S+\s*|\s+/g) ?? []).map((text) => ({ ...run, text }))
    );
    for (const token of tokens) {
      setRunFont(token);
      const word = token.text.trimEnd();
      const wordWidth = pdf.getTextWidth(word);
      if (lineHasText && word && x + wordWidth > right) {
        y += LINE_HEIGHT;
        ensureSpace(1, LINE_HEIGHT);
        x = left;
        lineHasText = false;
        underlineStart = null;
      }
      if (!lineHasText && !word) continue; // no leading spaces on a new line
      pdf.text(token.text, x, y);
      const width = pdf.getTextWidth(token.text);
      if (token.underline && word) {
        underlineStart ??= x;
        pdf.line(underlineStart, y + 0.8, x + wordWidth, y + 0.8);
      } else if (!token.underline) {
        underlineStart = null;
      }
      x += width;
      lineHasText = true;
    }
    y += LINE_HEIGHT;
    pdf.setFont("helvetica", "normal");
  }

  function formatted(text: string) {
    const plain = { bold: false, italic: false, underline: false };
    pdf.setFontSize(10);
    pdf.setLineWidth(0.2);
    for (const block of parseBlocks(text)) {
      switch (block.type) {
        case "blank":
          y += LINE_HEIGHT / 2;
          break;
        case "line":
          drawRuns(flatten(block.content, plain), marginX);
          break;
        case "ul":
          block.items.forEach((item) => drawRuns(flatten(item, plain), marginX + LIST_INDENT, "•"));
          break;
        case "ol":
          block.items.forEach((item, i) =>
            drawRuns(flatten(item, plain), marginX + LIST_INDENT, `${block.start + i}.`)
          );
          break;
      }
    }
    y += 3;
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  const titleLines = pdf.splitTextToSize(
    input.title ? `Meeting Minutes: ${input.title}` : "Meeting Minutes",
    maxWidth
  ) as string[];
  pdf.text(titleLines, marginX, y);
  y += titleLines.length * 7 + 1;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(projectName, marginX, y);
  y += 8;

  const metaLines = [
    `Date: ${formatDate(input.meetingDate)}`,
    input.meetingType ? `Type: ${input.meetingType}` : null,
    input.location ? `Location: ${input.location}` : null,
  ].filter((line): line is string => line !== null);
  metaLines.forEach((line) => {
    pdf.text(line, marginX, y);
    y += 5;
  });
  y += 3;

  if (input.attendees) {
    heading("Attendees");
    paragraph(input.attendees);
  }
  if (input.summary) {
    heading("Summary");
    formatted(input.summary);
  }
  if (input.notes) {
    heading("Notes");
    formatted(input.notes);
  }
  if (input.actions.length > 0) {
    heading("Actions");
    input.actions.forEach((action) => {
      const suffix = [action.ownerName, action.dueDateHint].filter(Boolean).join(", ");
      paragraph(`•  ${action.title}${suffix ? ` (${suffix})` : ""}`);
    });
  }

  return pdf.output("blob");
}
