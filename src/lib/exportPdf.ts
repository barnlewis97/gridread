import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { REFERENCE_NOTE, TERM_LABELS, type Analysis, type Severity, type TermKey } from "./schema";
import { resolveFileName } from "./fileName";

export type ExportOptions = {
  terms: TermKey[];
  riskFlags: boolean;
  summary: boolean;
  fileName: string;
};

type RGB = [number, number, number];

const TEAL: RGB = [13, 148, 136];
const TEXT: RGB = [24, 24, 27];
const MUTED: RGB = [113, 113, 122];
const SEVERITY: Record<Severity, { label: string; color: RGB }> = {
  high: { label: "HIGH", color: [220, 38, 38] },
  medium: { label: "MEDIUM", color: [217, 119, 6] },
  low: { label: "LOW", color: [22, 163, 74] },
};
const ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

const MARGIN = 15;

// jsPDF's built-in Helvetica only covers WinAnsi characters, so map common
// typographic symbols to plain equivalents and drop anything else it can't draw.
function clean(text: string): string {
  return text
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/→/g, "->")
    .replace(/←/g, "<-")
    .replace(/≈/g, "~")
    .replace(/[‐‑‒−]/g, "-")
    .replace(/[^\x00-\xFF€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g, "");
}

function lastTableY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function sectionHeading(doc: jsPDF, title: string, y: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y > pageHeight - 40) {
    doc.addPage();
    y = MARGIN + 5;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...TEAL);
  doc.text(title, MARGIN, y);
  return y + 4;
}

function referenceNote(doc: jsPDF, y: number, width: number): number {
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const lines = doc.splitTextToSize(REFERENCE_NOTE, width) as string[];
  doc.text(lines, MARGIN, y + 1);
  return y + lines.length * 3.5 + 2;
}

export function exportAnalysisPdf(analysis: Analysis, source: string, options: ExportOptions) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...TEAL);
  doc.text("GridRead", MARGIN, MARGIN + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(clean(`PPA risk review  |  ${source}  |  ${new Date().toLocaleDateString("en-GB")}`), MARGIN, MARGIN + 12);
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, MARGIN + 15, pageWidth - MARGIN, MARGIN + 15);

  let y = MARGIN + 25;

  if (options.terms.length > 0) {
    y = sectionHeading(doc, "Extracted terms", y);
    y = referenceNote(doc, y, contentWidth);
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Term", "Detail"]],
      body: options.terms.map((key) => [TERM_LABELS[key], clean(analysis.terms[key])]),
      styles: { font: "helvetica", fontSize: 9, textColor: TEXT, cellPadding: 2.5, valign: "top" },
      headStyles: { fillColor: TEAL, textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 45, fontStyle: "bold" } },
      alternateRowStyles: { fillColor: [244, 244, 245] },
    });
    y = lastTableY(doc) + 12;
  }

  if (options.riskFlags) {
    y = sectionHeading(doc, "Risk flags", y);
    y = referenceNote(doc, y, contentWidth);
    const flags = [...analysis.risk_flags].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
    if (flags.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...TEXT);
      doc.text("No risk flags identified.", MARGIN, y + 4);
      y += 16;
    } else {
      autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        body: flags.flatMap((flag) => [
          [
            {
              content: clean(`${SEVERITY[flag.severity].label}  |  ${flag.title}`),
              colSpan: 2,
              styles: { fillColor: SEVERITY[flag.severity].color, textColor: 255, fontStyle: "bold" },
            },
          ],
          ["Relates to", clean(flag.term)],
          ["Issue", clean(flag.issue)],
          ["Market standard", clean(flag.market_standard)],
          ["Recommendation", clean(flag.recommendation)],
        ]),
        styles: { font: "helvetica", fontSize: 9, textColor: TEXT, cellPadding: 2.5, valign: "top" },
        columnStyles: { 0: { cellWidth: 35, fontStyle: "bold", textColor: MUTED } },
        rowPageBreak: "avoid",
      });
      y = lastTableY(doc) + 12;
    }
  }

  if (options.summary) {
    y = sectionHeading(doc, "Summary", y);
    const overall = SEVERITY[analysis.overall_risk];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...overall.color);
    doc.text(`Overall risk: ${overall.label}`, MARGIN, y + 3);
    y += 9;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT);
    const lineHeight = 5;
    for (const line of doc.splitTextToSize(clean(analysis.summary), contentWidth) as string[]) {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = MARGIN + 5;
      }
      doc.text(line, MARGIN, y);
      y += lineHeight;
    }
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      "AI-generated analysis for information only - not legal advice. Minor variations between runs are possible.",
      MARGIN,
      pageHeight - 8,
    );
    doc.text(`Page ${i} of ${pages}`, pageWidth - MARGIN, pageHeight - 8, { align: "right" });
  }

  doc.save(resolveFileName(options.fileName));
}
