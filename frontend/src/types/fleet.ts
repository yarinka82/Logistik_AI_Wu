
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
  confirmed_at?: string | null;
  driving_license_expiry_date: string | null;
  license_expiring_soon: boolean;
}

export interface CarrierCompany {
  id: number;
  company_name: string;
  base_city?: string;
}

export type FuelType = "diesel" | "petrol" | "electric" | "hybrid" | "lpg";

export interface Vehicle {
  id: number;
  plate_number: string;
  brand: string;
  model: string;
  vehicle_type?: string;
  gross_vehicle_weight_kg?: number;
  payload_capacity_kg?: number;
  pallet_capacity?: number;
  fuel_type: FuelType;
  euro_emission_class?: string;
  assigned_driver_name?: string | null;
  assigned_driver?: number | null;
  insurance_expiry: string | null;
  tech_inspection_expiry: string | null;
  insurance_expiring_soon: boolean;
  tech_inspection_expiring_soon: boolean;
}

export interface CreateVehiclePayload {
  plate_number: string;
  brand?: string;
  model?: string;
  vehicle_type?: string;
  gross_vehicle_weight_kg?: number;
  payload_capacity_kg?: number;
  pallet_capacity?: number;
  fuel_type?: FuelType;
  euro_emission_class?: string;
  insurance_expiry?: string | null;
  tech_inspection_expiry?: string | null;
}