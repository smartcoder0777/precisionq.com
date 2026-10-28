export type ClinicsPageInsuranceOption = {
  id: number;
  name: string;
};

export type ClinicsPageClinic = {
  id: number;
  clinicIdDisplay: string;
  name: string;
  acronym: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  web: string;
  portal: string;
  insuranceIds: number[];
};

export type ClinicsPagePayload = {
  clinics: ClinicsPageClinic[];
  insuranceOptions: ClinicsPageInsuranceOption[];
};
