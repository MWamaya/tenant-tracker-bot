// supabase/functions/send-monthly-reports/index.ts
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { buildLandlordReport } from './report-data.ts';
import { generateReportPdf, generateDefaultersPdf } from './pdf.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// This function is invoked by pg_cron (via pg_net, using the service_role
// key from Vault) or manually by an operator with the service_role key for
// testing. It must never be callable with the public anon key or a regular
// user JWT — it sends real email to every matching landlord.
function isServiceRole(req: Request): boolean {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function monthLabel(targetMonth: string): string {
  const [year, month] = targetMonth.split('-');
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

function previousMonthKey(): string {
  const now = new Date();
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}`;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendReportEmail(
  resendApiKey: string,
  toEmail: string,
  ccEmails: string[],
  landlordName: string | null,
  targetMonth: string,
  report: Awaited<ReturnType<typeof buildLandlordReport>>,
  pdfBytes: ArrayBuffer,
  defaultersPdfBytes: ArrayBuffer,
): Promise<void> {
  const label = monthLabel(targetMonth);
  const pdfBase64 = arrayBufferToBase64(pdfBytes);
  const defaultersPdfBase64 = arrayBufferToBase64(defaultersPdfBytes);

  const defaulterRows = report.rows.filter((r) => r.status !== 'paid');
  const defaulterHtml = report.rows.length === 0
    ? '<p>No houses were found for this month\'s report.</p>'
    : defaulterRows.length === 0
    ? '<p>Every house was fully paid this month.</p>'
    : `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:13px">
        <tr style="background:#f1f5f9"><th>House</th><th>Tenant</th><th>Phone</th><th>This Month</th><th>Prior Arrears</th><th>Total Owed</th><th>Status</th></tr>
        ${defaulterRows.map((r) => `<tr><td>${escapeHtml(r.houseNo)}</td><td>${escapeHtml(r.tenantName || 'Unassigned')}</td><td>${escapeHtml(r.tenantPhone || '-')}</td><td>KES ${r.balance.toLocaleString()}</td><td>${r.priorArrears > 0 ? `KES ${r.priorArrears.toLocaleString()}` : '-'}</td><td><strong>KES ${r.totalOwed.toLocaleString()}</strong></td><td>${escapeHtml(r.status)}</td></tr>`).join('')}
      </table>`;

  const html = `
    <h2>Rent Report — ${label}</h2>
    <p>Hi ${escapeHtml(landlordName || 'there')},</p>
    <p>Here is your automatic rent report for ${label}: ${report.paidCount} paid, ${report.partialCount} partial, ${report.unpaidCount} unpaid.</p>
    <p><strong>Rent covered:</strong> KES ${report.totalCollected.toLocaleString()} of KES ${report.totalExpected.toLocaleString()} expected (KES ${report.totalOutstanding.toLocaleString()} outstanding).</p>
    <p style="font-size:12px;color:#64748b">Payments are applied to the oldest unpaid month first, so this reflects rent covered for ${label}, not necessarily cash received during that month.</p>
    <h3>Needs follow-up</h3>
    <p style="font-size:12px;color:#64748b">"Prior Arrears" is unpaid rent from before ${label}; "Total Owed" is everything currently outstanding.</p>
    ${defaulterHtml}
    <p>Two PDFs are attached: the full house-by-house payments report, and a defaulters &amp; arrears report.</p>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'KodiPap <noreply@kodipap.com>',
      to: [toEmail],
      ...(ccEmails.length > 0 ? { cc: ccEmails } : {}),
      subject: `Rent Report — ${label}`,
      html,
      attachments: [
        {
          filename: `rent-report-${targetMonth}.pdf`,
          content: pdfBase64,
        },
        {
          filename: `defaulters-report-${targetMonth}.pdf`,
          content: defaultersPdfBase64,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend send failed (${res.status}): ${await res.text()}`);
  }
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (!isServiceRole(req)) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    return jsonResponse({ error: 'Server misconfigured: RESEND_API_KEY not set' }, 500);
  }

  let body: { testLandlordId?: string; testMonth?: string } = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const supabase = createServiceClient();
  const results: { landlordId: string; status: 'sent' | 'failed'; error?: string }[] = [];

  if (body.testLandlordId) {
    const targetMonth = body.testMonth || previousMonthKey();
    const { data: landlord, error } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', body.testLandlordId)
      .eq('account_status', 'active')
      .maybeSingle();

    if (error || !landlord || !landlord.email) {
      return jsonResponse({ error: 'Landlord not found or has no email' }, 404);
    }

    try {
      const { data: recipients } = await supabase
        .from('report_recipients')
        .select('email')
        .eq('landlord_id', landlord.id);
      const ccEmails = (recipients || []).map((r: { email: string }) => r.email);

      const report = await buildLandlordReport(supabase, landlord.id, targetMonth);
      const pdf = generateReportPdf(monthLabel(targetMonth), report.rows);
      const defaultersPdf = generateDefaultersPdf(monthLabel(targetMonth), report.rows);
      await sendReportEmail(resendApiKey, landlord.email, ccEmails, landlord.full_name, targetMonth, report, pdf, defaultersPdf);
      results.push({ landlordId: landlord.id, status: 'sent' });
    } catch (err) {
      results.push({ landlordId: landlord.id, status: 'failed', error: err instanceof Error ? err.message : String(err) });
    }

    return jsonResponse({ processed: 1, results });
  }

  const today = new Date().getUTCDate();
  const targetMonth = previousMonthKey();

  const { data: landlords, error: landlordsError } = await supabase
    .from('profiles')
    .select('id, email, full_name, report_day_of_month')
    .eq('account_status', 'active');

  if (landlordsError) {
    return jsonResponse({ error: landlordsError.message }, 500);
  }

  const matching = (landlords || []).filter((l) => l.report_day_of_month === today && l.email);

  for (const landlord of matching) {
    try {
      const { data: recipients } = await supabase
        .from('report_recipients')
        .select('email')
        .eq('landlord_id', landlord.id);
      const ccEmails = (recipients || []).map((r: { email: string }) => r.email);

      const report = await buildLandlordReport(supabase, landlord.id, targetMonth);
      const pdf = generateReportPdf(monthLabel(targetMonth), report.rows);
      const defaultersPdf = generateDefaultersPdf(monthLabel(targetMonth), report.rows);
      await sendReportEmail(resendApiKey, landlord.email as string, ccEmails, landlord.full_name, targetMonth, report, pdf, defaultersPdf);
      results.push({ landlordId: landlord.id, status: 'sent' });
    } catch (err) {
      console.error(`Failed to send report for landlord ${landlord.id}:`, err);
      results.push({ landlordId: landlord.id, status: 'failed', error: err instanceof Error ? err.message : String(err) });
    }
  }

  console.log('send-monthly-reports summary:', JSON.stringify({ processed: matching.length, results }));
  return jsonResponse({ processed: matching.length, results });
});
