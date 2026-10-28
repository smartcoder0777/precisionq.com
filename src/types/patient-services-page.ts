export type PatientServicesCategoryRow = {
  id: string;
  names: Record<string, string>;
  status: "Active" | "Inactive";
};

export type PatientServicesPagePayload = {
  categories: PatientServicesCategoryRow[];
};
