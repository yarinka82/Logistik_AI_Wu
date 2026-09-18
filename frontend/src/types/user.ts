
import { Role } from "./roles";

export interface AdminUser {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  role: Role;
  is_verified: boolean;
  is_blocked: boolean;
  blocked_at: string | null;
  date_joined: string;
}



// --- Employer Company Data ---
export interface EmployerCompany {
  id: number;
  company_name: string;
  company_registration_number?: string;
}

// --- Profile data by role ---
export interface DriverProfileData {
  id: number;
  full_name: string;
  driver_license_number: string;
  is_confirmed_by_employer: boolean;
  employer: EmployerCompany | null;
  driving_license_expiry_date?: string | null;
  license_photo?: string | null;
}

export interface CarrierCompanyProfileData {
  id: number;
  company_name: string;
  company_registration_number: string;
}

export interface ClientCompanyProfileData {
  company_name: string;
  company_registration_number: string;
}

export interface ClientIndividualProfileData {
  full_name: string;
}

// --- Basic User Interface ---
interface BaseUser {
  id: number;
  email: string;
  username: string;
  phone: string | null;
  is_verified: boolean;
  license_photo: string | null;
}

// --- Discriminant user associations ---
export interface DriverUser extends BaseUser {
  role: typeof Role.Driver;
  profile_data: DriverProfileData;
}

export interface CarrierCompanyUser extends BaseUser {
  role: typeof Role.CarrierCompany;
  profile_data: CarrierCompanyProfileData;
}

export interface ClientCompanyUser extends BaseUser {
  role: typeof Role.ClientCompany;
  profile_data: ClientCompanyProfileData;
}

export interface ClientIndividualUser extends BaseUser {
  role: typeof Role.ClientIndividual;
  profile_data: ClientIndividualProfileData;
}

export interface StaffUser extends BaseUser {
  role: typeof Role.Accountant | typeof Role.Admin;
  profile_data: Record<string, unknown>;
}

// Main User Type
export type User =
  | DriverUser
  | CarrierCompanyUser
  | ClientCompanyUser
  | ClientIndividualUser
  | StaffUser;