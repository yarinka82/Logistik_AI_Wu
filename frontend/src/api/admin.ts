
import type { AxiosInstance } from "axios";
import type { AdminUser, Role } from "../types";

export async function fetchAdminUsersRequest(
  api: AxiosInstance,
  filters: { role?: Role; is_blocked?: boolean; search?: string },
  signal?: AbortSignal
) {
  return api.get<AdminUser[]>("/admin/users/", { params: filters, signal });
}

export async function blockUserRequest(api: AxiosInstance, userId: number) {
  return api.post<AdminUser>(`/admin/users/${userId}/block/`);
}

export async function unblockUserRequest(api: AxiosInstance, userId: number) {
  return api.post<AdminUser>(`/admin/users/${userId}/unblock/`);
}