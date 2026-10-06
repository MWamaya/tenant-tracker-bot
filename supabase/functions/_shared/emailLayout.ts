// Shared branded HTML wrapper for every outbound transactional email.
// Email clients don't support real stylesheets, so this stays table-based
// with inline styles — the safest baseline across Outlook/Gmail/Apple Mail.
// Matches the app's navy (#1E3A5F) + teal (#0F766E/#2DD4BF) identity.

export interface EmailLayoutOptions {
  /** Short line shown in the inbox preview, before the subject is opened. */
  preheader?: string;
  /** Recipient's name, used in the header greeting line when provided. */
  recipientName?: string | null;
  /** Main content — already-built HTML, rendered inside the white card. */
  bodyHtml: string;
}

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function renderEmailLayout({ preheader, bodyHtml }: EmailLayoutOptions): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
            <tr>
              <td style="background-color:#1E3A5F;padding:24px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:32px;height:32px;background-color:rgba(45,212,191,0.15);border:1px solid rgba(45,212,191,0.3);border-radius:8px;text-align:center;vertical-align:middle;font-size:16px;">
                      🏠
                    </td>
                    <td style="padding-left:10px;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">
                      KODI PAP
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#0F172A;font-size:14px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;color:#64748B;font-size:12px;line-height:1.5;">
                KodiPap — Rent collection made simple.<br />
                You're receiving this because you have an account with KodiPap. Questions? Reply to this email or reach us at support@kodipap.com.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** A teal pill-style button for calls to action inside bodyHtml. */
export function emailButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
    <tr>
      <td style="background-color:#0F766E;border-radius:8px;">
        <a href="${href}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}
