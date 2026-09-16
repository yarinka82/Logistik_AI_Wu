
export const Role = {
  ClientCompany: "client_company",
  ClientIndividual: "client_individual",
  Driver: "driver",
  CarrierCompany: "carrier_company",
  Accountant: "accountant",
  Admin: "admin",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export interface User {
  id: number;
  email: string;
  username: string;
  phone: string | null;
  role: Role;
  is_verified: boolean;
  license_photo: string | null;

  driver_profile?: DriverProfileData | null;
  carrier_company_profile?: CarrierCompanyProfileData | null;

    profile_data?: UserProfileData & {
    id?: number;
    full_name?: string;
    driver_license_number?: string;
    is_confirmed_by_employer?: boolean;
    employer?: EmployerCompany | null;
    company_name?: string;
    company_registration_number?: string;
  };

}



export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  phone?: string;
  password: string;
  role: Role;
  company_name?: string;
  company_registration_number?: string;
  full_name?: string;
  driver_license_number?: string;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

// 1. Данные компании-работодателя
export interface EmployerCompany {
  id: number;
  company_name: string;
  company_registration_number?: string;
}

export interface EmployerInfo {
  id: number;
  company_name: string;
  company_registration_number?: string;
}

// 2. Данные профиля водителя внутри profile_data
export interface DriverProfileData {
  id: number;
  full_name: string;
  driver_license_number: string;
  is_confirmed_by_employer: boolean;
  employer: EmployerCompany | null;
}

// 3. Данные профиля компании-перевозчика внутри profile_data
export interface CarrierCompanyProfileData {
  id: number;
  company_name: string;
  company_registration_number: string;
}

// 4. Данные профиля клиента-фирмы
export interface ClientCompanyProfileData {
  company_name: string;
  company_registration_number: string;
}

// 5. Данные профиля клиента-физлица
export interface ClientIndividualProfileData {
  full_name: string;
}

// Объединение всех возможных типов profile_data
export type UserProfileData =
  | DriverProfileData
  | CarrierCompanyProfileData
  | ClientCompanyProfileData
  | ClientIndividualProfileData
  | Record<string, unknown>;


