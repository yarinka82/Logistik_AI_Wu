
import { isAxiosError } from "axios";

/**
 * Извлекает человекочитаемое сообщение об ошибке из ответа axios.
 * Порядок разбора:
 *  1. data — просто строка → она и есть сообщение
 *  2. data.detail — строка (DRF-style единичная ошибка)
 *  3. остальные поля объекта (валидационные ошибки по полям) — склеиваются в одну строку
 *  4. обычный Error (не связанный с axios) — err.message
 *  5. ничего не подошло — fallback
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err) && err.response?.data) {
    const data: unknown = err.response.data;

    if (typeof data === "string") {
      return data;
    }

    if (typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;

      if (typeof obj.detail === "string") {
        return obj.detail;
      }

      const joined = Object.values(obj).flat().join(" ");
      if (joined) {
        return joined;
      }
    }
  }

  if (err instanceof Error) {
    return err.message;
  }

  return fallback;
}