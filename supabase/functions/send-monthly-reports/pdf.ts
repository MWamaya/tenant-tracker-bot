import jsPDF from 'https://esm.sh/jspdf@4.2.1';
import autoTable from 'https://esm.sh/jspdf-autotable@5.0.7';
import { HouseReportRow } from './report-data.ts';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(amount);

export function generateReportPdf(monthLabel: string, rows: HouseReportRow[]): ArrayBuffer {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Rent Collection Report', 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Month: ${monthLabel}`, 14, 28);

  autoTable(doc, {
    startY: 36,
    head: [['House No', 'Tenant', 'Phone', 'Expected', 'Rent Covered', 'Balance', 'Status']],
    body: rows.map((r) => [
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

export function generateDefaultersPdf(monthLabel: string, rows: HouseReportRow[]): ArrayBuffer {
  const defaulterRows = rows.filter((r) => r.status !== 'paid');
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Defaulters & Arrears Report', 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Month: ${monthLabel}`, 14, 28);

  if (defaulterRows.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Every house was fully paid this month.', 14, 42);
    return doc.output('arraybuffer');
  }

  autoTable(doc, {
    startY: 36,
    head: [['House No', 'Tenant', 'Phone', 'This Month', 'Prior Arrears', 'Total Owed', 'Status']],
    body: defaulterRows.map((r) => [
      r.houseNo,
      r.tenantName || 'Unassigned',
      r.tenantPhone || '-',
      formatCurrency(r.balance),
      r.priorArrears > 0 ? formatCurrency(r.priorArrears) : '-',
      formatCurrency(r.totalOwed),
      r.status.charAt(0).toUpperCase() + r.status.slice(1),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [153, 27, 27] },
  });

  return doc.output('arraybuffer');
}
