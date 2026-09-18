
import { isAxiosError } from "axios";
import type {TFunction} from "i18next";

/**
 * Extracts a human-readable error message from the axios response.
 * Disassembly procedure:
 *  1. data — just a string → it is a message
 *  2. data.detail — string (DRF-style single error)
 *  3. other fields of the object (validation errors by fields) — are glued in one line
 *  4. normal Error (not related to axios) — err.message
 *  5. nothing came up — fallback*/
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

interface UploadErrorPayload {
  code?: string;
  extension?: string;
  allowed?: string[];
  max_mb?: number;
}

export function translateUploadError(err: unknown, t: TFunction): string {
  const data = (err as { response?: { data?: UploadErrorPayload } })?.response?.data;

  switch (data?.code) {
    case "unsupported_file_type":
      return t("profile.errorUnsupportedType", {
        extension: data.extension,
        allowed: data.allowed?.join(", "),
      });
    case "file_too_large":
      return t("profile.errorFileTooLarge", { maxMb: data.max_mb });
    case "corrupted_image":
      return t("profile.errorCorruptedImage");
    default:
      return extractErrorMessage(err, t("profile.photoError", "Не вдалося завантажити фото"));
  }
}