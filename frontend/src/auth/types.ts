
export const Role = {
  ClientCompany: "client_company",
  ClientIndividual: "client_individual",
  Driver: "driver",
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
  edrpou?: string;
  full_name?: string;
  driver_license_number?: string;
}

export interface TokenPair {
  access: string;
  refresh: string;
}