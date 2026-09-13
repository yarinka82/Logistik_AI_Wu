
import type { AxiosInstance } from "axios";

export interface StaffDriver {
  id: number;
  full_name: string;
  driver_license_number: string;
  license_photo: string | null;
  email: string;
  is_active: boolean;
}

export interface Invite {
  id: number;
  code: string;
  created_at: string;
  expires_at: string;
  used_by: number | null;
}

export interface Vehicle {
  id: number;
  plate_number: string;
  brand: string;
  model: string;
  assigned_driver_name: string | null;
  insurance_expiry: string | null;
  tech_inspection_expiry: string | null;
  insurance_expiring_soon: boolean;
  tech_inspection_expiring_soon: boolean;
}

export function fetchDriversRequest(api: AxiosInstance, signal?: AbortSignal) {
  return api.get<StaffDriver[]>("/fleet/drivers/", { signal });
}

export function toggleDriverActiveRequest(api: AxiosInstance, driverId: number, isActive: boolean) {
  return api.patch(`/fleet/drivers/${driverId}/`, { is_active: isActive });
}

export function removeDriverRequest(api: AxiosInstance, driverId: number) {
  return api.delete(`/fleet/drivers/${driverId}/`);
}

export function fetchInvitesRequest(api: AxiosInstance, signal?: AbortSignal) {
  return api.get<Invite[]>("/fleet/invites/", { signal });
}

export function generateInviteRequest(api: AxiosInstance) {
  return api.post("/fleet/invites/", {});
}

export function fetchVehiclesRequest(api: AxiosInstance, signal?: AbortSignal) {
  return api.get<Vehicle[]>("/fleet/vehicles/", { signal });
}