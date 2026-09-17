
import type { AxiosInstance } from "axios";

export interface StaffDriver {
  id: number;
  full_name: string;
  driver_license_number: string;
  license_photo: string | null;
  email: string;
  phone: string | null;
  is_active: boolean;
  status: string;
  is_confirmed_by_employer: boolean;
  driving_license_expiry_date: string | null;
  license_expiring_soon: boolean;
}

export interface CarrierCompany {
  id: number;
  company_name: string;
  base_city: string;
}

export interface Vehicle {
  id: number;
  plate_number: string;
  brand: string;
  model: string;
  vehicle_type: string;
  gross_vehicle_weight_kg: number;
  payload_capacity_kg: number;
  pallet_capacity: number;
  fuel_type: "diesel" | "petrol" | "electric" | "hybrid" | "lpg";
  euro_emission_class: string;
  insurance_expiry: string | null;
  tech_inspection_expiry: string | null;
  vehicle_ref: string | null;
  assigned_driver_name?: string | null;
  is_active: boolean;
}

export interface NewVehiclePayload {
  plate_number: string;
  brand?: string;
  model?: string;
  insurance_expiry?: string | null;
  tech_inspection_expiry?: string | null;
}

export interface CreateVehiclePayload {
  plate_number: string;
  brand?: string;
  model?: string;
  vehicle_type?: string;
  gross_vehicle_weight_kg: number;      // обязательное в модели
  payload_capacity_kg: number;          // обязательное в модели
  pallet_capacity?: number;
  fuel_type?: Vehicle["fuel_type"];
  euro_emission_class?: string;
}

// --- Водії (панель власника) ---

export function fetchDriversRequest(
  api: AxiosInstance,
  status?: "pending" | "confirmed",
  signal?: AbortSignal,
) {
  return api.get<StaffDriver[]>("/fleet/staff-drivers/", {
    params: status ? { status } : undefined,
    signal,
  });
}

export function approveDriverRequest(api: AxiosInstance, driverId: number) {
  return api.post(`/fleet/staff-drivers/${driverId}/approve/`);
}

export function rejectDriverRequest(api: AxiosInstance, driverId: number) {
  return api.post(`/fleet/staff-drivers/${driverId}/reject/`);
}

export function dismissDriverRequest(api: AxiosInstance, driverId: number) {
  return api.post(`/fleet/staff-drivers/${driverId}/dismiss/`);
}

// --- Заявки водія (власний профіль) ---

export function fetchCarrierCompaniesRequest(api: AxiosInstance, signal?: AbortSignal) {
  return api.get<CarrierCompany[]>("/fleet/carrier-companies/", { signal });
}

export function requestJoinCompanyRequest(api: AxiosInstance, companyId: number) {
  return api.post("/fleet/driver-profiles/request-join/", { company_id: companyId });
}

export function cancelJoinRequestRequest(api: AxiosInstance) {
  return api.post("/fleet/driver-profiles/cancel-request/");
}

export function leaveCompanyRequest(api: AxiosInstance) {
  return api.post("/fleet/driver-profiles/leave-company/");
}

// --- Транспорт ---

export function fetchVehiclesRequest(api: AxiosInstance, signal?: AbortSignal) {
  return api.get<Vehicle[]>("/fleet/vehicles/", { signal });
}

export function fetchVehicleRequest(api: AxiosInstance, id: number | string, signal?: AbortSignal) {
  return api.get<Vehicle>(`/fleet/vehicles/${id}/`, { signal });
}

export function createVehicleRequest(api: AxiosInstance, payload: CreateVehiclePayload) {
  return api.post<Vehicle>("/fleet/vehicles/", payload);
}

export function updateVehicleRequest(
  api: AxiosInstance,
  id: number | string,
  payload: Partial<CreateVehiclePayload> & { insurance_expiry?: string | null; tech_inspection_expiry?: string | null }
) {
  return api.patch<Vehicle>(`/fleet/vehicles/${id}/`, payload);
}

export function assignDriverToVehicleRequest(api: AxiosInstance, vehicleId: number, driverId: number | null) {
  return api.patch<Vehicle>(`/fleet/vehicles/${vehicleId}/`, { assigned_driver: driverId });
}