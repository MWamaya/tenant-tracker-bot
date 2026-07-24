import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { htmlToText, extractForwardedFrom } from './emailText.ts';

Deno.test('htmlToText strips tags and decodes entities', () => {
  const html = '<div>Amount: <b>KES&nbsp;5,000</b></div><p>Ref: ABC123</p>';
  const result = htmlToText(html);
  assertEquals(result, 'Amount: KES 5,000\nRef: ABC123');
});

Deno.test('htmlToText collapses excessive blank lines', () => {
  const html = '<p>Line one</p><br><br><br><p>Line two</p>';
  const result = htmlToText(html);
  assertEquals(result, 'Line one\n\nLine two');
});

Deno.test('extractForwardedFrom finds the original sender in a Gmail forward block', () => {
  const text = [
    'Hi team, forwarding this for processing.',
    '',
    '---------- Forwarded message ---------',
    'From: Bank Alerts <alerts@examplebank.co.ke>',
    'Date: Mon, Jul 20, 2026 at 9:15 AM',
    'Subject: Transaction Alert',
    'To: John Landlord <john@kodipap.app>',
    '',
    'You have received KES 5,000 from JANE DOE for 12A on 20/07/2026 09:14 AM. M-Pesa Ref: QAB1CD2EF3',
  ].join('\n');

  assertEquals(extractForwardedFrom(text), 'alerts@examplebank.co.ke');
});

Deno.test('extractForwardedFrom returns null when there is no forwarded block', () => {
  assertEquals(extractForwardedFrom('Just a plain message with no forward header.'), null);
});
