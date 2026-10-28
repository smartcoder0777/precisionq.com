import { mapAgreementRecordsToPageRows } from "@/lib/agreements-grouping";
import * as AgreementModel from "@/models/agreement.model";
import * as ClinicModel from "@/models/clinic.model";
import type { AgreementsPagePayload } from "@/types/agreements-page";

export async function loadAgreementsPagePayload(): Promise<AgreementsPagePayload> {
  const [agreementRows, clinicRows] = await Promise.all([
    AgreementModel.getAllAgreements(),
    ClinicModel.getAllClinics(),
  ]);

  const rows = mapAgreementRecordsToPageRows(agreementRows);
  const clinics = clinicRows.map(c => ({
    id: c.id,
    name: (c.name ?? "").trim() || `Clinic #${c.id}`,
  }));

  return { rows, clinics };
}
