export type PatientCategoryServiceRow = {
  id: string;
  categoryId: string;
  names: Record<string, string>;
  descriptions: Record<string, string>;
  details: Record<string, string>;
  contact: string;
  image: string | null;
  status: "Active" | "Inactive";
};

export type PatientCategoryServicesPagePayload = {
  categoryId: string;
  categoryNameEn: string;
  services: PatientCategoryServiceRow[];
};
