import jsPDF from 'https://esm.sh/jspdf@4.2.1';
import autoTable from 'https://esm.sh/jspdf-autotable@5.0.7';
import { LandlordReport } from './report-data.ts';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(amount);

const GREEN: [number, number, number] = [22, 163, 74];
const AMBER: [number, number, number] = [217, 119, 6];
const RED: [number, number, number] = [220, 38, 38];
const TRACK: [number, number, number] = [226, 232, 240];
const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [71, 85, 105];

// deno-lint-ignore no-explicit-any
type PdfDoc = any;

// One point on a circle of the given radius, angle in degrees measured
// clockwise from the top (0° = 12 o'clock) — matches the Collection Rate
// gauge on the Reports page (a RadialBarChart starting at the top).
function pointOnCircle(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
}

// Strokes one ring segment (donut arc) from startAngle to endAngle degrees.
// jsPDF has no arc primitive, so the arc is approximated with short straight
// segments — fine at this radius/line-width, the seams aren't visible.
function drawRingSegment(
  doc: PdfDoc,
  cx: number,
  cy: number,
  radius: number,
  lineWidth: number,
  startAngle: number,
  endAngle: number,
  color: [number, number, number],
) {
  if (endAngle <= startAngle) return;
  doc.setDrawColor(...color);
  doc.setLineWidth(lineWidth);
  if (doc.setLineCap) doc.setLineCap('round');
  const steps = Math.max(1, Math.ceil((endAngle - startAngle) / 3));
  let [px, py] = pointOnCircle(cx, cy, radius, startAngle);
  for (let i = 1; i <= steps; i++) {
    const angle = startAngle + ((endAngle - startAngle) * i) / steps;
    const [x, y] = pointOnCircle(cx, cy, radius, angle);
    doc.line(px, py, x, y);
    px = x;
    py = y;
  }
}

function drawDonutChart(
  doc: PdfDoc,
  cx: number,
  cy: number,
  radius: number,
  lineWidth: number,
  segments: [number, [number, number, number]][],
) {
  const total = segments.reduce((s, [v]) => s + v, 0);
  if (total <= 0) {
    drawRingSegment(doc, cx, cy, radius, lineWidth, 0, 360, TRACK);
    return;
  }
  let angle = 0;
  for (const [value, color] of segments) {
    if (value <= 0) continue;
    const sweep = (value / total) * 360;
    drawRingSegment(doc, cx, cy, radius, lineWidth, angle, angle + sweep, color);
    angle += sweep;
  }
}

function centeredText(doc: PdfDoc, text: string, cx: number, y: number) {
  const width = doc.getTextWidth(text);
  doc.text(text, cx - width / 2, y);
}

// A small rounded stat card with a tinted background, used for the
// Collected/Outstanding figures under the Collection Rate donut — same look
// as the .stat-card boxes on the Reports page.
function drawStatCard(
  doc: PdfDoc,
  x: number,
  y: number,
  w: number,
  h: number,
  bg: [number, number, number],
  label: string,
  value: string,
  valueColor: [number, number, number],
) {
  doc.setFillColor(...bg);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  centeredText(doc, label, x + w / 2, y + 6);
  doc.setFontSize(11);
  doc.setTextColor(...valueColor);
  centeredText(doc, value, x + w / 2, y + 12.5);
}

// Draws the same two charts as the Reports page's "Graphic Overview": a
// Collection Rate donut with Collected/Outstanding stat cards underneath,
// and a Houses Breakdown donut with a Paid/Partial/Unpaid legend. jsPDF has
// no charting API (and no canvas is available in Deno), so these are
// hand-drawn with arcs/rects rather than a chart library. Returns the Y
// position to continue drawing from.
function drawCollectionSummary(doc: PdfDoc, startY: number, report: LandlordReport): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const fullWidth = pageWidth - marginX * 2;
  const gap = 10;
  const colWidth = (fullWidth - gap) / 2;
  const leftCx = marginX + colWidth / 2;
  const rightCx = marginX + colWidth + gap + colWidth / 2;

  let y = startY;
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text('Collection Summary', marginX, y);
  y += 8;

  const donutTopY = y;
  const radius = 15;
  const donutCy = donutTopY + radius;

  // Collection Rate donut (left)
  const rate = report.totalExpected > 0 ? Math.round((report.totalCollected / report.totalExpected) * 100) : 0;
  const rateColor = rate >= 80 ? GREEN : rate >= 50 ? AMBER : RED;
  drawRingSegment(doc, leftCx, donutCy, radius, 6, 0, 360, TRACK);
  if (rate > 0) drawRingSegment(doc, leftCx, donutCy, radius, 6, 0, Math.min(rate, 100) * 3.6, rateColor);
  doc.setFontSize(14);
  doc.setTextColor(...rateColor);
  centeredText(doc, `${rate}%`, leftCx, donutCy + 2);
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  centeredText(doc, 'Collection Rate', leftCx, donutTopY + radius * 2 + 8);

  // Houses Breakdown donut (right)
  drawDonutChart(doc, rightCx, donutCy, radius, 6, [
    [report.paidCount, GREEN],
    [report.partialCount, AMBER],
    [report.unpaidCount, RED],
  ]);
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  centeredText(doc, 'Houses Breakdown', rightCx, donutTopY + radius * 2 + 8);

  let cardY = donutTopY + radius * 2 + 13;

  // Collected / Outstanding stat cards under the rate donut
  const statW = (colWidth - 4) / 2;
  const statH = 15;
  drawStatCard(doc, marginX, cardY, statW, statH, [220, 252, 231], 'Collected', formatCurrency(report.totalCollected), GREEN);
  drawStatCard(doc, marginX + statW + 4, cardY, statW, statH, [254, 243, 199], 'Outstanding', formatCurrency(report.totalOutstanding), AMBER);

  // Paid/Partial/Unpaid legend under the houses donut
  const legend: [string, number, [number, number, number]][] = [
    ['Paid', report.paidCount, GREEN],
    ['Partial', report.partialCount, AMBER],
    ['Unpaid', report.unpaidCount, RED],
  ];
  const legendColWidth = colWidth / 3;
  legend.forEach(([label, count, color], i) => {
    const lx = marginX + colWidth + gap + legendColWidth * i + legendColWidth / 2;
    doc.setFillColor(...color);
    doc.circle(lx, cardY + 3, 1.4, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    centeredText(doc, `${count}`, lx, cardY + 9);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    centeredText(doc, label, lx, cardY + 13.5);
  });

  y = cardY + statH + 8;
  return y;
}

export function generateReportPdf(monthLabel: string, report: LandlordReport): ArrayBuffer {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(...INK);
  doc.text('Rent Collection Report', 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(`Month: ${monthLabel}`, 14, 28);

  const summaryEndY = drawCollectionSummary(doc, 40, report);

  autoTable(doc, {
    startY: summaryEndY,
    head: [['House No', 'Tenant', 'Phone', 'Expected', 'Rent Covered', 'Balance', 'Status']],
    body: report.rows.map((r) => [
      r.houseNo,
      r.tenantName || 'Unassigned',
      r.tenantPhone || '-',
      formatCurrency(r.expectedRent),
      formatCurrency(r.paidAmount),
      formatCurrency(r.balance),
      r.status.charAt(0).toUpperCase() + r.status.slice(1),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] },
  });

  return doc.output('arraybuffer');
}

export function generateDefaultersPdf(monthLabel: string, report: LandlordReport): ArrayBuffer {
  const defaulterRows = report.rows.filter((r) => r.status !== 'paid');
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(...INK);
  doc.text('Defaulters & Arrears Report', 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(`Month: ${monthLabel}`, 14, 28);

  const summaryEndY = drawCollectionSummary(doc, 40, report);

  let nextY = summaryEndY;
  if (defaulterRows.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(...INK);
    doc.text('Every house was fully paid this month.', 14, nextY + 6);
    nextY += 16;
  } else {
    autoTable(doc, {
      startY: summaryEndY,
      head: [['House No', 'Tenant', 'Phone', 'This Month', 'Prior Arrears', 'Total Owed', 'Status', 'Owes Today']],
      body: defaulterRows.map((r) => [
        r.houseNo,
        r.tenantName || 'Unassigned',
        r.tenantPhone || '-',
        formatCurrency(r.balance),
        r.priorArrears > 0 ? formatCurrency(r.priorArrears) : '-',
        formatCurrency(r.totalOwed),
        r.status.charAt(0).toUpperCase() + r.status.slice(1),
        r.currentBalance <= 0 ? 'Settled since' : formatCurrency(r.currentBalance),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [153, 27, 27] },
      // deno-lint-ignore no-explicit-any
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 7) {
          data.cell.styles.textColor = data.cell.raw === 'Settled since' ? GREEN : RED;
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    // deno-lint-ignore no-explicit-any
    nextY = (doc as any).lastAutoTable.finalY + 12;

    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text('"Owes Today" reflects payments made after this report\'s month too — the other columns are frozen as of the end of that month.', 14, nextY - 6);
  }

  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(`Expenses — ${monthLabel}`, 14, nextY);
  nextY += 4;

  if (report.expenses.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text('No expenses recorded for this month.', 14, nextY + 6);
  } else {
    autoTable(doc, {
      startY: nextY + 4,
      head: [['Date', 'Category', 'Description', 'Amount']],
      body: report.expenses.map((e) => [
        e.expenseDate,
        e.category + (e.isRecurring ? ' (Recurring)' : ''),
        e.description || '-',
        formatCurrency(e.amount),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] },
      foot: [['', '', 'Total Expenses', formatCurrency(report.totalExpenses)]],
      footStyles: { fillColor: [241, 245, 249], textColor: INK, fontStyle: 'bold' },
    });
    // deno-lint-ignore no-explicit-any
    const afterExpensesY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setTextColor(...(report.netIncome >= 0 ? GREEN : RED));
    doc.text(`Net Income (Rent Covered - Expenses): ${formatCurrency(report.netIncome)}`, 14, afterExpensesY);
  }

  return doc.output('arraybuffer');
}
