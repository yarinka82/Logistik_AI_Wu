
// ==========================================
// 1. TYPES FOR FUEL AND TRANSPORT
// ==========================================
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
  vehicle_ref?: string | null;
  assigned_driver?: number | null;
  assigned_driver_name?: string | null;
  is_active?: boolean;
  insurance_expiry: string | null;
  tech_inspection_expiry: string | null;
  insurance_expiring_soon?: boolean;
  tech_inspection_expiring_soon?: boolean;
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

// Backward compatibility alias
export type NewVehiclePayload = Partial<CreateVehiclePayload> & {
  plate_number: string;
};

// ==========================================
// 2. DRIVERS (LIST AND DETAILS)
// ==========================================
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

export type DriverDetail = {
  id: number;
  full_name: string;
  driver_license_number: string | null;
  base_city: string | null;
  driving_license_categories: string[] | string | null;
  driving_license_expiry_date: string | null;
  code_95_categories: string[] | string | null;
  code_95_expiry_date: string | null;
  has_adr: boolean;
  adr_expiry_date: string | null;
  default_vehicle: number | null;
  // read-only
  license_photo: string | null;
  email: string;
  phone: string | null;
  is_active: boolean;
  status: string;
  is_confirmed_by_employer: boolean;
  confirmed_at: string | null;
  license_expiring_soon: boolean;
  code_95_expiring_soon: boolean;
  adr_expiring_soon: boolean;
};

/** Fields allowed for company editing*/
export type UpdateDriverPayload = Partial<
  Pick<
    DriverDetail,
    | "full_name"
    | "driver_license_number"
    | "base_city"
    | "driving_license_categories"
    | "driving_license_expiry_date"
    | "code_95_categories"
    | "code_95_expiry_date"
    | "has_adr"
    | "adr_expiry_date"
    | "default_vehicle"
  >
>;

// ==========================================
// 3. shipping companies
// ==========================================
export interface CarrierCompany {
  id: number;
  company_name: string;
  base_city?: string;
}