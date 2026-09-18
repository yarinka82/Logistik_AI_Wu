
/**
 * Formats the ISO date (YYYY-MM-DD) into the European standard DD.MM.YYYY.
 * Parses the string directly (no Date object) to avoid UTC/local timezone
 * shifting the day when the browser's timezone is behind UTC.
 * Example: "2026-09-18" -> "18.09.2026"
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";

  const datePart = dateStr.split("T")[0]; 
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) return dateStr;

  const [, year, month, day] = match;
  return `${day}.${month}.${year}`;
}