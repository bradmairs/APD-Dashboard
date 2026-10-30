import { jsPDF } from "jspdf";
import { toPlainText } from "./richText";
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
    paragraph(toPlainText(input.summary));
  }
  if (input.notes) {
    heading("Notes");
    paragraph(toPlainText(input.notes));
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
