
/**
 * Форматирует ISO-дату (YYYY-MM-DD) в европейский стандарт DD.MM.YYYY.
 * Пример: "2026-09-18" -> "18.09.2026"
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}