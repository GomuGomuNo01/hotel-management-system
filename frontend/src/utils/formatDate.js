import { format, formatDistanceToNow, parseISO, differenceInCalendarDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const safeDate = (d) => (typeof d === 'string' ? parseISO(d) : d);

export const formatDate = (date, pattern = 'dd/MM/yyyy') =>
  date ? format(safeDate(date), pattern, { locale: fr }) : '-';

export const formatDateTime = (date) => formatDate(date, "dd/MM/yyyy 'à' HH:mm");

export const fromNow = (date) =>
  date ? formatDistanceToNow(safeDate(date), { addSuffix: true, locale: fr }) : '';

export const nightsBetween = (a, b) => {
  if (!a || !b) return 0;
  return Math.max(differenceInCalendarDays(safeDate(b), safeDate(a)), 0);
};
