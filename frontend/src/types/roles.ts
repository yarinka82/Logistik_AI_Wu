
export const Role = {
  ClientCompany: "client_company",
  ClientIndividual: "client_individual",
  Driver: "driver",
  CarrierCompany: "carrier_company",
  Accountant: "accountant",
  Admin: "admin",
} as const;

export type Role = (typeof Role)[keyof typeof Role];