import { format } from 'date-fns';

/** App-wide display format for a date: "10th Sep 2026". */
export const formatDate = (date: string | Date): string =>
  format(new Date(date), 'do MMM yyyy');

/** App-wide display format for a date with time: "10th Sep 2026, 14:30". */
export const formatDateTime = (date: string | Date): string =>
  `${formatDate(date)}, ${format(new Date(date), 'HH:mm')}`;
