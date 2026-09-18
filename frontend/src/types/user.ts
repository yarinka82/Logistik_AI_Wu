
import { Role } from "./roles";

// --- Данные компании-работодателя ---
export interface EmployerCompany {
  id: number;
  company_name: string;
  company_registration_number?: string;
}

// --- Данные профилей по ролям ---
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

// --- Базовый интерфейс пользователя ---
interface BaseUser {
  id: number;
  email: string;
  username: string;
  phone: string | null;
  is_verified: boolean;
  license_photo: string | null;
}

// --- Дискриминантные объединения пользователей ---
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

// Главный тип User
export type User =
  | DriverUser
  | CarrierCompanyUser
  | ClientCompanyUser
  | ClientIndividualUser
  | StaffUser;