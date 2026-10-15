import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// Rasterizes a report's DOM node (the same content the Print button shows,
// via the browser's print styles) and slices it into A4 pages — used by
// MonthlyReportViewPage and ProjectCloseoutReportPage so a report can be
// downloaded and shared as an actual .pdf file, not just printed. A canvas
// screenshot rather than a hand-built PDF layout: these reports already
// have print-tuned CSS (print:p-0, print:border-0, etc.), so re-deriving
// that layout in PDF-drawing calls would just be a second copy to keep in
// sync with the HTML.
export async function downloadElementAsPdf(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`Element #${elementId} not found`);

  // scale: 1.5 (not the html2canvas default of 2, and not devicePixelRatio,
  // which can be higher still on a hi-DPI screen) keeps the rasterized text
  // legible at print size without producing an oversized file — a report
  // like this is a few hundred KB at 1.5x vs. several MB at native-DPI
  // scale, with no visible quality loss at A4 print size. JPEG (vs. PNG)
  // shrinks it further; this is a screenshot of formatted text and tables,
  // not a photo, but the compression artifacts are imperceptible at 0.92
  // quality and the size win is substantial.
  const canvas = await html2canvas(element, {
    scale: 1.5,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
