import { describe, expect, it } from 'vitest';
import { rowsToCsv } from './csvExport';

interface Row {
  name: string;
  amount: number;
  note: string;
}

describe('rowsToCsv', () => {
  const columns = [
    { header: 'Name', accessor: (r: Row) => r.name },
    { header: 'Amount', accessor: (r: Row) => r.amount },
    { header: 'Note', accessor: (r: Row) => r.note },
  ];

  it('writes a header row followed by one row per input', () => {
    const csv = rowsToCsv<Row>(
      [{ name: 'Jane Doe', amount: 500, note: 'ok' }],
      columns
    );
    expect(csv).toBe('Name,Amount,Note\r\nJane Doe,500,ok');
  });

  it('returns only the header row for an empty input array', () => {
    const csv = rowsToCsv<Row>([], columns);
    expect(csv).toBe('Name,Amount,Note');
  });

  it('quotes and escapes a field containing a comma', () => {
    const csv = rowsToCsv<Row>(
      [{ name: 'Doe, Jane', amount: 1, note: '' }],
      columns
    );
    expect(csv).toContain('"Doe, Jane"');
  });

  it('quotes and escapes a field containing a double quote', () => {
    const csv = rowsToCsv<Row>(
      [{ name: 'Jane "JJ" Doe', amount: 1, note: '' }],
      columns
    );
    expect(csv).toContain('"Jane ""JJ"" Doe"');
  });

  it('quotes and escapes a field containing an embedded newline', () => {
    const csv = rowsToCsv<Row>(
      [{ name: 'Jane Doe', amount: 1, note: 'line1\nline2' }],
      columns
    );
    expect(csv).toContain('"line1\nline2"');
  });
});
