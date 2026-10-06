// supabase/functions/send-monthly-reports/index.ts
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { renderEmailLayout } from '../_shared/emailLayout.ts';
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
    ? '<p style="color:#64748B;">No houses were found for this month\'s report.</p>'
    : defaulterRows.length === 0
    ? '<p style="color:#16a34a;font-weight:600;">Every house was fully paid this month. 🎉</p>'
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
        <tr style="background-color:#F1F5F9;">
          <th style="text-align:left;padding:8px 10px;color:#475569;">House</th>
          <th style="text-align:left;padding:8px 10px;color:#475569;">Tenant</th>
          <th style="text-align:left;padding:8px 10px;color:#475569;">Phone</th>
          <th style="text-align:right;padding:8px 10px;color:#475569;">This Month</th>
          <th style="text-align:right;padding:8px 10px;color:#475569;">Prior Arrears</th>
          <th style="text-align:right;padding:8px 10px;color:#475569;">Total Owed</th>
          <th style="text-align:left;padding:8px 10px;color:#475569;">Status</th>
          <th style="text-align:right;padding:8px 10px;color:#475569;">Owes Today</th>
        </tr>
        ${defaulterRows.map((r) => `<tr style="border-top:1px solid #E2E8F0;">
          <td style="padding:8px 10px;color:#0F172A;">${escapeHtml(r.houseNo)}</td>
          <td style="padding:8px 10px;color:#0F172A;">${escapeHtml(r.tenantName || 'Unassigned')}</td>
          <td style="padding:8px 10px;color:#64748B;">${escapeHtml(r.tenantPhone || '-')}</td>
          <td style="padding:8px 10px;color:#0F172A;text-align:right;">KES ${r.balance.toLocaleString()}</td>
          <td style="padding:8px 10px;color:#64748B;text-align:right;">${r.priorArrears > 0 ? `KES ${r.priorArrears.toLocaleString()}` : '-'}</td>
          <td style="padding:8px 10px;color:#0F172A;font-weight:600;text-align:right;">KES ${r.totalOwed.toLocaleString()}</td>
          <td style="padding:8px 10px;color:#0F172A;text-transform:capitalize;">${escapeHtml(r.status)}</td>
          <td style="padding:8px 10px;text-align:right;font-weight:600;color:${r.currentBalance <= 0 ? '#16a34a' : '#dc2626'};">${r.currentBalance <= 0 ? 'Settled since' : `KES ${r.currentBalance.toLocaleString()}`}</td>
        </tr>`).join('')}
      </table>`;

  const statPill = (label: string, value: number, color: string) =>
    `<td style="padding:4px 8px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background-color:${color}1A;border:1px solid ${color}40;border-radius:999px;padding:6px 14px;font-size:12px;font-weight:600;color:${color};white-space:nowrap;">${value} ${escapeHtml(label)}</td></tr></table></td>`;

  const bodyHtml = `
    <h2 style="margin:0 0 4px;font-size:20px;color:#0F172A;">Rent Report — ${escapeHtml(label)}</h2>
    <p style="margin:0 0 20px;color:#64748B;">Hi ${escapeHtml(landlordName || 'there')}, here's how collections went this month.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr>
        ${statPill('paid', report.paidCount, '#16a34a')}
        ${statPill('partial', report.partialCount, '#d97706')}
        ${statPill('unpaid', report.unpaidCount, '#dc2626')}
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0FDFA;border:1px solid #CCFBF1;border-radius:10px;margin:0 0 8px;">
      <tr>
        <td style="padding:16px 20px;">
          <div style="font-size:12px;color:#0F766E;font-weight:600;letter-spacing:0.02em;text-transform:uppercase;">Rent covered</div>
          <div style="font-size:22px;font-weight:700;color:#0F172A;margin-top:4px;">KES ${report.totalCollected.toLocaleString()} <span style="font-size:13px;font-weight:400;color:#64748B;">of KES ${report.totalExpected.toLocaleString()} expected</span></div>
          <div style="font-size:13px;color:#dc2626;margin-top:2px;">KES ${report.totalOutstanding.toLocaleString()} outstanding</div>
        </td>
      </tr>
    </table>
    <p style="font-size:12px;color:#94A3B8;margin:0 0 24px;">Payments are applied to the oldest unpaid month first, so this reflects rent covered for ${escapeHtml(label)}, not necessarily cash received during that month.</p>

    <h3 style="margin:0 0 6px;font-size:15px;color:#0F172A;">Needs follow-up</h3>
    <p style="font-size:12px;color:#94A3B8;margin:0 0 12px;">"Prior Arrears" is unpaid rent from before ${escapeHtml(label)}; "Total Owed" is everything outstanding as of the end of ${escapeHtml(label)}. "Owes Today" reflects payments made since then too — someone marked "Settled since" has since caught up.</p>
    ${defaulterHtml}

    <p style="margin:24px 0 0;color:#64748B;font-size:13px;">Two PDFs are attached: the full house-by-house payments report, and a defaulters &amp; arrears report.</p>
  `;

  const html = renderEmailLayout({
    preheader: `${label}: KES ${report.totalCollected.toLocaleString()} collected, KES ${report.totalOutstanding.toLocaleString()} outstanding`,
    bodyHtml,
  });

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
      const pdf = generateReportPdf(monthLabel(targetMonth), report);
      const defaultersPdf = generateDefaultersPdf(monthLabel(targetMonth), report);
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
      const pdf = generateReportPdf(monthLabel(targetMonth), report);
      const defaultersPdf = generateDefaultersPdf(monthLabel(targetMonth), report);
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
