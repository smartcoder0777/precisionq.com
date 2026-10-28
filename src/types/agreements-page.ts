import type { AgreementPageRow } from "@/lib/agreements-grouping";

export type { AgreementPageRow };

export type AgreementClinicOption = {
  id: number;
  name: string;
};

export type AgreementsPagePayload = {
  rows: AgreementPageRow[];
  clinics: AgreementClinicOption[];
};
