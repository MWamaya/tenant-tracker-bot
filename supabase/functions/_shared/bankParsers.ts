
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

// Only one bank today (NCBA). match() accepts, in order of strength:
// (1) the immediate forwarded sender is on the real bank's domain
// (ncbagroup.com); (2) the domain appears anywhere in the body (catches
// multi-hop forwards where the outer forward header belongs to an
// intermediate forwarder, but the bank's footer/branding text survives);
// (3) the bank name "NCBA" appears anywhere in the body. Some forward
// paths (e.g. mobile Gmail forwards) don't preserve the "Forwarded
// message" header block or the full footer at all, only the notification
// body text itself, which still names the bank. Case (3) is the weakest
// signal (any email just containing "NCBA" would pass), but it's what
// survives every forward format seen in testing so far. When a second
// bank is added, add a new entry for it with its own checks ahead of or
// after this one in this array.
const BANK_PARSERS: BankParser[] = [
  {
    name: 'ncba',
    match: (originalFrom, text) => {
      const lowerText = text.toLowerCase();
      return (
        (originalFrom?.toLowerCase().endsWith('@ncbagroup.com') ?? false) ||
        lowerText.includes('ncbagroup.com') ||
        lowerText.includes('ncba')
      );
    },
    parse: parseDefaultBankNotification,
  },
];

export function parseBankEmail(text: string, originalFrom: string | null): ParsedPayment | null {
  const parser = BANK_PARSERS.find((p) => p.match(originalFrom, text));
  if (!parser) return null;
  return parser.parse(text);
}
