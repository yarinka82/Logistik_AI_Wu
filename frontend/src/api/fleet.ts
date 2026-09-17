
import type { AxiosInstance } from "axios";
import type {
  CarrierCompany,
  CreateVehiclePayload,
  DriverDetail,
  StaffDriver,
  UpdateDriverPayload,
  Vehicle,
} from "../types";

// ==========================================
// 1. ВОДІЇ (ПАНЕЛЬ ВЛАСНИКА)
// ==========================================

export function fetchDriversRequest(
  api: AxiosInstance,
  status?: "pending" | "confirmed",
  signal?: AbortSignal
) {
  return api.get<StaffDriver[]>("/fleet/staff-drivers/", {
    params: status ? { status } : undefined,
    signal,
  });
}

export const fetchDriverRequest = (
  api: AxiosInstance,
  id: number | string,
  signal?: AbortSignal
) => api.get<DriverDetail>(`/fleet/staff-drivers/${id}/`, { signal });

export const updateDriverRequest = (
  api: AxiosInstance,
  id: number | string,
  payload: UpdateDriverPayload
) => api.patch<DriverDetail>(`/fleet/staff-drivers/${id}/`, payload);

export function approveDriverRequest(api: AxiosInstance, driverId: number | string) {
  return api.post(`/fleet/staff-drivers/${driverId}/approve/`);
}

export function rejectDriverRequest(api: AxiosInstance, driverId: number | string) {
  return api.post(`/fleet/staff-drivers/${driverId}/reject/`);
}

export function dismissDriverRequest(api: AxiosInstance, driverId: number | string) {
  return api.post(`/fleet/staff-drivers/${driverId}/dismiss/`);
}

// ==========================================
// 2. ЗАЯВКИ ВОДІЯ (ВЛАСНИЙ ПРОФІЛЬ)
// ==========================================

export function fetchCarrierCompaniesRequest(
  api: AxiosInstance,
  signal?: AbortSignal
) {
  return api.get<CarrierCompany[]>("/fleet/carrier-companies/", { signal });
}

export function requestJoinCompanyRequest(
  api: AxiosInstance,
  companyId: number
) {
  return api.post("/fleet/driver-profiles/request-join/", {
    company_id: companyId,
  });
}

export function cancelJoinRequestRequest(api: AxiosInstance) {
  return api.post("/fleet/driver-profiles/cancel-request/");
}

export function leaveCompanyRequest(api: AxiosInstance) {
  return api.post("/fleet/driver-profiles/leave-company/");
}

// ==========================================
// 3. ТРАНСПОРТ
// ==========================================

export function fetchVehiclesRequest(
  api: AxiosInstance,
  signal?: AbortSignal
) {
  return api.get<Vehicle[]>("/fleet/vehicles/", { signal });
}

export function fetchVehicleRequest(
  api: AxiosInstance,
  id: number | string,
  signal?: AbortSignal
) {
  return api.get<Vehicle>(`/fleet/vehicles/${id}/`, { signal });
}

export function createVehicleRequest(
  api: AxiosInstance,
  payload: CreateVehiclePayload
) {
  return api.post<Vehicle>("/fleet/vehicles/", payload);
}

export function updateVehicleRequest(
  api: AxiosInstance,
  id: number | string,
  payload: Partial<CreateVehiclePayload> & {
    insurance_expiry?: string | null;
    tech_inspection_expiry?: string | null;
  }
) {
  return api.patch<Vehicle>(`/fleet/vehicles/${id}/`, payload);
}

export function deleteVehicleRequest(
  api: AxiosInstance,
  id: number | string
) {
  return api.delete(`/fleet/vehicles/${id}/`);
}

export function assignDriverToVehicleRequest(
  api: AxiosInstance,
  vehicleId: number | string,
  driverId: number | null
) {
  return api.patch<Vehicle>(`/fleet/vehicles/${vehicleId}/`, {
    assigned_driver: driverId,
  });
}