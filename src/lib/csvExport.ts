export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number;
  /** Matches a DataTable column id, to filter the CSV by current column
   * visibility. Optional for backwards compatibility; columns without an
   * id are always included. */
  id?: string;
}

const escapeCsvField = (value: string | number): string => {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const rowsToCsv = <T>(rows: T[], columns: CsvColumn<T>[]): string => {
  const header = columns.map((c) => escapeCsvField(c.header)).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvField(c.accessor(row))).join(',')
  );
  return [header, ...lines].join('\r\n');
};

// Triggers a browser download of the given CSV content. No prior
// Blob-download pattern exists elsewhere in this codebase — this is the
// first use of the Blob + createObjectURL + temporary <a download> pattern.
export const downloadCsv = (filename: string, csvContent: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
