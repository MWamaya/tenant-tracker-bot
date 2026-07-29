// supabase/functions/_shared/bankParsers.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { parseBankEmail } from './bankParsers.ts';

const HAPPY_PATH_TEXT =
  'You have received KES 5,000 from JANE DOE for 212245 A12 on 20/07/2026 09:14 AM. M-Pesa Ref: QAB1CD2EF3';

const NCBA_SENDER = 'ncbacustomer@ncbagroup.com';

Deno.test('parseBankEmail extracts amount, house, tenant, reference, date', () => {
  const result = parseBankEmail(HAPPY_PATH_TEXT, NCBA_SENDER);
  assertEquals(result?.amount, 5000);
  assertEquals(result?.houseNo, 'A12');
  assertEquals(result?.tenantName, 'JANE DOE');
  assertEquals(result?.reference, 'QAB1CD2EF3');
  assertEquals(result?.paymentDate, new Date('2026-07-20 09:14 AM').toISOString());
});

Deno.test('parseBankEmail returns null when amount is missing', () => {
  const result = parseBankEmail('Your account was credited. M-Pesa Ref: QAB1CD2EF3', NCBA_SENDER);
  assertEquals(result, null);
});

Deno.test('parseBankEmail returns null when reference is missing', () => {
  const result = parseBankEmail('You have received KES 5,000 from JANE DOE for 212245 A12.', NCBA_SENDER);
  assertEquals(result, null);
});

Deno.test('parseBankEmail accepts any sender on the ncbagroup.com domain', () => {
  const result = parseBankEmail(HAPPY_PATH_TEXT, 'alerts@ncbagroup.com');
  assertEquals(result?.amount, 5000);
});

Deno.test('parseBankEmail returns null when original sender is not from the bank domain', () => {
  const result = parseBankEmail(HAPPY_PATH_TEXT, 'attacker@evil.com');
  assertEquals(result, null);
});

Deno.test('parseBankEmail correctly converts PM time to 24-hour format', () => {
  const pmText =
    'You have received KES 5,000 from JANE DOE for 212245 A12 on 20/07/2026 02:30 PM. M-Pesa Ref: QAB1CD2EF3';
  const result = parseBankEmail(pmText, NCBA_SENDER);
  assertEquals(result?.paymentDate, new Date('2026-07-20 14:30').toISOString());
});

Deno.test('parseBankEmail strips the paybill prefix, keeping only the unit code', () => {
  const noSpaceText =
    'Dear MICHAEL O a transaction of KES 50.00 for 212245B13 has been received from VICTOR OCHIENG on 29/07/2026 03:17 PM. M-Pesa Ref: UGTK91984D. NCBA, Go for it.';
  const result = parseBankEmail(noSpaceText, NCBA_SENDER);
  assertEquals(result?.houseNo, 'B13');
});

Deno.test('parseBankEmail returns null houseNo when the unit has no letter prefix', () => {
  const malformedText =
    'Dear MICHAEL O a transaction of KES 50.00 for 212245 13 has been received from VICTOR OCHIENG on 29/07/2026 03:48 PM. M-Pesa Ref: UGTK919B9M. NCBA, Go for it.';
  const result = parseBankEmail(malformedText, NCBA_SENDER);
  assertEquals(result?.houseNo, null);
});
