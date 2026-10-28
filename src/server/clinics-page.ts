import "server-only";

import * as ClinicInsuranceModel from "@/models/clinic-insurance.model";
import * as ClinicModel from "@/models/clinic.model";
import * as InsuranceModel from "@/models/insurance.model";
import type { ClinicsPageClinic, ClinicsPagePayload } from "@/types/clinics-page";
import { formatUsPhoneDisplay } from "@/lib/phone-format";

function toDisplayString(value: unknown, empty = ""): string {
  if (value === null || value === undefined) return empty;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : empty;
  if (typeof value === "string") return value;
  return String(value);
}

export async function loadClinicsPagePayload(): Promise<ClinicsPagePayload> {
  const [clinicRows, insuranceRows] = await Promise.all([
    ClinicModel.getAllClinics(),
    InsuranceModel.getAllInsurances(),
  ]);

  const ids = clinicRows.map((c) => c.id);
  const links = await ClinicInsuranceModel.getInsuranceIdsByClinicPks(ids);

  const clinics: ClinicsPageClinic[] = clinicRows.map((row) => ({
    id: row.id,
    clinicIdDisplay: row.clinic_id != null ? String(row.clinic_id) : "",
    name: toDisplayString(row.name),
    acronym: toDisplayString(row.acronym),
    address1: toDisplayString(row.address1),
    address2: toDisplayString(row.address2),
    city: toDisplayString(row.city),
    state: toDisplayString(row.state),
    zip: toDisplayString(row.zip),
    phone: formatUsPhoneDisplay(row.phone, ""),
    email: toDisplayString(row.email),
    web: toDisplayString(row.web),
    portal: toDisplayString(row.portal),
    insuranceIds: links.get(row.id) ?? [],
  }));

  const insuranceOptions = insuranceRows.map((r) => ({
    id: r.id,
    name: toDisplayString(r.name, "—"),
  }));

  return { clinics, insuranceOptions };
}
