/*
 * Compact Danish relative dates from the design's list-row timestamps:
 * "2 d." (days), "1 u." (weeks), falling back to a short absolute date
 * ("2. okt" / "2. okt 2025") for anything older than four weeks.
 */

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar days between two dates, ignoring the time of day. */
function daysBetween(from: Date, to: Date): number {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

export function formatRelativeDate(date: Date, now: Date = new Date()): string {
  const days = daysBetween(date, now);

  if (days <= 0) return 'i dag';
  if (days < 7) return `${days} d.`;
  if (days < 28) return `${Math.floor(days / 7)} u.`;

  const year = date.getFullYear() === now.getFullYear() ? '' : ` ${date.getFullYear()}`;
  return `${date.getDate()}. ${MONTHS[date.getMonth()]}${year}`;
}
