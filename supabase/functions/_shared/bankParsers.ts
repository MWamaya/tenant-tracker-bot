
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
    const [datePart, timePart, meridiem] = dateMatch[1].split(/\s+/);
    const [day, month, year] = datePart.split('/');
    let [hours, minutes] = timePart.split(':').map((v) => parseInt(v, 10));
    if (meridiem) {
      const upperMeridiem = meridiem.toUpperCase();
      if (upperMeridiem === 'PM' && hours !== 12) {
        hours += 12;
      } else if (upperMeridiem === 'AM' && hours === 12) {
        hours = 0;
      }
    }
    const normalizedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    paymentDate = new Date(`${year}-${month}-${day} ${normalizedTime}`).toISOString();
  }

  if (!amount || !reference) return null;

  return { amount, houseNo, tenantName, reference, paymentDate };
}

interface BankParser {
  name: string;
  match: (originalFrom: string | null, text: string) => boolean;
  parse: (text: string) => ParsedPayment | null;
}

// Only one bank today (NCBA). match() accepts either: the immediate
// forwarded sender is on the real bank's domain (ncbagroup.com), OR the
// domain appears anywhere in the body (catches multi-hop forwards, e.g.
// bank -> person A -> person B -> landlord, where the outer forward header
// belongs to an intermediate forwarder rather than the bank, but the bank's
// own footer/branding text is still present). The body-substring path is
// weaker (a forged email just needs that string somewhere), but real
// forwarding chains are commonly more than one hop, so this is the
// practical tradeoff. When a second bank is added, add a new entry for it
// with its own domain check ahead of or after this one in this array.
const BANK_PARSERS: BankParser[] = [
  {
    name: 'ncba',
    match: (originalFrom, text) =>
      (originalFrom?.toLowerCase().endsWith('@ncbagroup.com') ?? false) ||
      text.toLowerCase().includes('ncbagroup.com'),
    parse: parseDefaultBankNotification,
  },
];

export function parseBankEmail(text: string, originalFrom: string | null): ParsedPayment | null {
  const parser = BANK_PARSERS.find((p) => p.match(originalFrom, text));
  if (!parser) return null;
  return parser.parse(text);
}
