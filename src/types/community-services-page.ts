export type CommunityServicesCategoryRow = {
  id: string;
  names: Record<string, string>;
  status: "Active" | "Inactive";
};

export type CommunityServicesServiceRow = {
  id: string;
  categoryIds: string[];
  image: string | null;
  names: Record<string, string>;
  descriptions: Record<string, string>;
  details: Record<string, string>;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  fax: string;
  email: string;
  link: string;
  additional: string;
  clinicIds: string[];
  status: "Active" | "Inactive";
};

export type CommunityServicesClinicOption = {
  id: string;
  name: string;
};

export type CommunityServicesPagePayload = {
  categories: CommunityServicesCategoryRow[];
  services: CommunityServicesServiceRow[];
  clinics: CommunityServicesClinicOption[];
};
