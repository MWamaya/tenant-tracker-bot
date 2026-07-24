// supabase/functions/_shared/bankParsers.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { parseBankEmail } from './bankParsers.ts';

const HAPPY_PATH_TEXT =
  'You have received KES 5,000 from JANE DOE for 12A on 20/07/2026 09:14 AM. M-Pesa Ref: QAB1CD2EF3';

Deno.test('parseBankEmail extracts amount, house, tenant, reference, date', () => {
  const result = parseBankEmail(HAPPY_PATH_TEXT, 'alerts@examplebank.co.ke');
  assertEquals(result?.amount, 5000);
  assertEquals(result?.houseNo, '12A');
  assertEquals(result?.tenantName, 'JANE DOE');
  assertEquals(result?.reference, 'QAB1CD2EF3');
  assertEquals(result?.paymentDate, new Date('2026-07-20 09:14 AM').toISOString());
});

Deno.test('parseBankEmail returns null when amount is missing', () => {
  const result = parseBankEmail('Your account was credited. M-Pesa Ref: QAB1CD2EF3', 'alerts@examplebank.co.ke');
  assertEquals(result, null);
});

Deno.test('parseBankEmail returns null when reference is missing', () => {
  const result = parseBankEmail('You have received KES 5,000 from JANE DOE for 12A.', 'alerts@examplebank.co.ke');
  assertEquals(result, null);
});
