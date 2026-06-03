import { parse, isValid } from 'date-fns';

export interface ParsedTextRow {
  payment_date: string;       // ISO
  amount: number;
  mpesa_ref: string;
  sender_name: string | null;
  sender_phone: string | null;
  house_no: string | null;
  raw: string;
}

const tryParseDate = (s: string): string | null => {
  if (!s) return null;
  const formats = [
    'd/M/yy h:mm a',
    'd/M/yy h:mm:ss a',
    'd/M/yy HH:mm',
    'd/M/yy HH:mm:ss',
    'd/M/yyyy h:mm a',
    'd/M/yyyy hh:mm a',
    'd/M/yyyy hh:mm:ss a',
    'd/M/yyyy HH:mm',
    'd/M/yyyy HH:mm:ss',
    'dd/MM/yyyy hh:mm a',
    'dd/MM/yyyy HH:mm',
    'dd/MM/yyyy HH:mm:ss',
    'dd/MM/yyyy',
    'yyyy-MM-dd HH:mm:ss',
    'yyyy-MM-dd HH:mm',
    'yyyy-MM-dd',
    'MMM d, yyyy h:mm a',
    'MMM d yyyy h:mm a',
    'd MMM yyyy h:mm a',
    'd MMM yyyy HH:mm',
  ];
  for (const f of formats) {
    const d = parse(s.trim(), f, new Date());
    if (isValid(d)) return d.toISOString();
  }
  const fallback = new Date(s);
  return isValid(fallback) ? fallback.toISOString() : null;
};

// M-Pesa refs are exactly 10 alphanumeric chars AND always contain at least
// one letter and one digit. Requiring a digit prevents 10-letter names
// (e.g. "SHITAMBASI") from being misread as the reference.
const RX_REF_LABELED = /M-?PESA\s*Ref(?:erence)?\s*[:#-]?\s*([A-Z0-9]{10})\b/i;
const RX_REF_GENERIC = /\b(?=[A-Z0-9]{10}\b)(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])([A-Z0-9]{10})\b/;
const RX_AMOUNT    = /(?:Ksh|KES|KSH)\s*\.?\s*([\d,]+(?:\.\d{1,2})?)/i;         // Ksh1,500.00
const RX_PHONE     = /(\+?254\d{9}|07\d{8}|01\d{8})/;                           // KE phone numbers
const RX_DATE_TIME = /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(?:at\s+)?(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/;
const RX_FROM_NAME = /from\s+([A-Z][A-Z\s.'-]{2,}?)(?:\s+\d|\s+0?7|\s+0?1|\s+\+?254|\s*\.|\s*$)/i;
const RX_HOUSE_ACC = /(?:Acc(?:ount)?\.?(?:\s*No\.?)?|Account\s*#|for\s+account|account|\bfor)\s*[:#-]?\s*([A-Za-z0-9-]+)/i;
const RX_NEW_BAL   = /New\s+M-?PESA\s+balance/i;

/**
 * Splits raw text into individual transaction blocks.
 * Heuristic: each block usually starts with an M-Pesa reference (10 alnum chars)
 * followed by "Confirmed". Falls back to splitting on blank lines.
 */
export function splitTransactionBlocks(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, '\n').trim();
  if (!cleaned) return [];

  // Try splitting on M-Pesa-style refs at start of a line
  const refStartSplit = cleaned.split(/\n(?=[A-Z0-9]{10}\s+Confirmed)/i);
  if (refStartSplit.length > 1) return refStartSplit.map((b) => b.trim()).filter(Boolean);

  // Try splitting on blank lines
  const blankSplit = cleaned.split(/\n\s*\n+/);
  if (blankSplit.length > 1) return blankSplit.map((b) => b.trim()).filter(Boolean);

  // Single transaction
  return [cleaned];
}

/**
 * Parses one transaction block into a ParsedTextRow. Returns null if no
 * usable amount + reference can be detected.
 */
export function parseTransactionBlock(block: string): ParsedTextRow | null {
  const text = block.trim();
  if (!text) return null;

  const amountMatch = text.match(RX_AMOUNT);
  const refMatch    = text.match(RX_REF_LABELED) || text.match(RX_REF_GENERIC);
  if (!amountMatch || !refMatch) return null;

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (!isFinite(amount) || amount <= 0) return null;

  const dateMatch = text.match(RX_DATE_TIME);
  let payment_date: string | null = null;
  if (dateMatch) {
    payment_date = tryParseDate(`${dateMatch[1]} ${dateMatch[2]}`);
  }
  if (!payment_date) {
    // Fallback: date-only
    const dateOnly = text.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/);
    if (dateOnly) payment_date = tryParseDate(dateOnly[1]);
  }
  if (!payment_date) payment_date = new Date().toISOString();

  const phoneMatch = text.match(RX_PHONE);
  const nameMatch  = text.match(RX_FROM_NAME);
  const houseMatch = text.match(RX_HOUSE_ACC);

  const sender_name = nameMatch
    ? nameMatch[1].replace(/\s+/g, ' ').trim().replace(/\.$/, '')
    : null;

  // Normalize house ref: bank bill refs are often "<accountPrefix><houseCode>"
  // e.g. "212245B12" -> "B12". Extract the trailing letter+digits token if present.
  let house_no: string | null = houseMatch ? houseMatch[1] : null;
  if (house_no) {
    house_no = house_no.replace(/\s+/g, '');
    const tail = house_no.match(/[A-Za-z]+\d+$/);
    if (tail) house_no = tail[0].toUpperCase();
    else house_no = house_no.toUpperCase();
  }

  return {
    payment_date,
    amount,
    mpesa_ref: refMatch[1].toUpperCase(),
    sender_name,
    sender_phone: phoneMatch ? phoneMatch[1] : null,
    house_no,
    raw: text,
  };
}

export function parseBankText(text: string): ParsedTextRow[] {
  return splitTransactionBlocks(text)
    .map(parseTransactionBlock)
    .filter((r): r is ParsedTextRow => r !== null);
}
