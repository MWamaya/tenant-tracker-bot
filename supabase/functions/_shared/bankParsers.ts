
export interface ParsedPayment {
  amount: number;
  houseNo: string | null;
  tenantName: string | null;
  reference: string;
  paymentDate: string | null;
}

function parseDefaultBankNotification(text: string): ParsedPayment | null {
  const amountMatch = text.match(/KES\s*([\d,]+(?:\.\d{2})?)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;

  const houseMatch = text.match(/for\s+(\d+\s*[A-Z0-9]+)/i);
  const houseNo = houseMatch ? houseMatch[1].trim() : null;

  const nameMatch = text.match(/from\s+([A-Z\s]+?)\s+(?:for|on)/i);
  const tenantName = nameMatch ? nameMatch[1].trim() : null;

  const refMatch = text.match(/M-Pesa\s*Ref[:\s]*([A-Z0-9]+)/i);
  const reference = refMatch ? refMatch[1] : null;

  const dateMatch = text.match(/on\s+(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
  let paymentDate: string | null = null;
  if (dateMatch) {
    const [datePart, timePart] = dateMatch[1].split(/\s+/);
    const [day, month, year] = datePart.split('/');
    paymentDate = new Date(`${year}-${month}-${day} ${timePart}`).toISOString();
  }

  if (!amount || !reference) return null;

  return { amount, houseNo, tenantName, reference, paymentDate };
}

interface BankParser {
  name: string;
  match: (originalFrom: string | null) => boolean;
  parse: (text: string) => ParsedPayment | null;
}

// Only one bank today, so match() always returns true. When a second bank
// is added, change this to a real domain check (e.g.
// originalFrom?.endsWith('@ourbankdomain.co.ke')) and add a new entry for
// the second bank ahead of or after it in this array.
const BANK_PARSERS: BankParser[] = [
  {
    name: 'default-bank',
    match: () => true,
    parse: parseDefaultBankNotification,
  },
];

export function parseBankEmail(text: string, originalFrom: string | null): ParsedPayment | null {
  const parser = BANK_PARSERS.find((p) => p.match(originalFrom));
  if (!parser) return null;
  return parser.parse(text);
}
