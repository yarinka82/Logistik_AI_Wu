import type { AxiosInstance } from "axios";
import { authClient } from "./client";
import type { LoginPayload, RegisterPayload, TokenPair, User } from "../auth/types";

export function loginRequest(payload: LoginPayload) {
  return authClient.post<TokenPair>("/login/", payload);
}

export function registerRequest(payload: RegisterPayload) {
  return authClient.post("/register/", payload);
}

export function refreshTokenRequest(refresh: string) {
  return authClient.post<TokenPair>("/token/refresh/", { refresh });
}

export function forgotPasswordRequest(email: string) {
  return authClient.post("/password-reset/", { email });
}

export function resetPasswordConfirmRequest(uid: string, token: string, newPassword: string) {
  return authClient.post("/password-reset/confirm/", { uid, token, new_password: newPassword });
}

export function fetchMeRequest(api: AxiosInstance) {
  return api.get<User>("/auth/me/");
}

// Требуют авторизованного инстанса (api из useAuth), не authClient
export function updateProfileRequest(api: AxiosInstance, payload: { phone: string }) {
  return api.patch<User>("/auth/me/", payload);
}

export function changePasswordRequest(
  api: AxiosInstance,
  payload: { old_password: string; new_password: string }
) {
  return api.post("/auth/change-password/", payload);
}

export function uploadLicensePhotoRequest(api: AxiosInstance, file: File) {
  const form = new FormData();
  form.append("license_photo", file);
  return api.post<{ license_photo: string }>("/auth/me/license-photo/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}