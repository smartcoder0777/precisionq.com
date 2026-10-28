export type InsurancePageClinicOption = {
  id: number;
  name: string;
};

export type InsurancePageRow = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  fax: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  /** Single line for the table. */
  addressLine: string;
  status: "Active" | "Inactive";
  img: string;
  clinicIds: number[];
  clinicNames: string[];
};

export type InsurancePagePayload = {
  rows: InsurancePageRow[];
  clinicOptions: InsurancePageClinicOption[];
};
