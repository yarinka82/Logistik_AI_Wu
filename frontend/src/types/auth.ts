
import { Role } from "./roles";

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
  also_drives?: boolean;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
}

export interface ResetPasswordConfirmPayload {
  uid: string;
  token: string;
  new_password: string;
}