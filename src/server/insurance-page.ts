import * as ClinicInsuranceModel from "@/models/clinic-insurance.model";
import * as ClinicModel from "@/models/clinic.model";
import * as InsuranceModel from "@/models/insurance.model";
import type { InsurancePageClinicOption, InsurancePagePayload, InsurancePageRow } from "@/types/insurance-page";
import { formatUsPhoneDisplay } from "@/lib/phone-format";

function formatAddressLine(r: InsuranceModel.InsuranceRecord): string {
  const parts = [r.address, r.city, r.state, r.zip].filter((p): p is string => !!p && String(p).trim() !== "");
  return parts.length > 0 ? parts.join(", ") : "—";
}

export async function loadInsurancePagePayload(): Promise<InsurancePagePayload> {
  const [insuranceRows, clinicRows] = await Promise.all([
    InsuranceModel.getAllInsurances(),
    ClinicModel.getAllClinics(),
  ]);

  const insuranceIds = insuranceRows.map(r => r.id);
  const links = await ClinicInsuranceModel.getClinicIdsByInsurancePks(insuranceIds);
  const clinicNameById = new Map(clinicRows.map(c => [c.id, (c.name ?? "").trim() || `Clinic #${c.id}`]));

  const clinicOptions: InsurancePageClinicOption[] = clinicRows.map(c => ({
    id: c.id,
    name: (c.name ?? "").trim() || `Clinic #${c.id}`,
  }));

  const rows: InsurancePageRow[] = insuranceRows.map(r => {
    const clinicIds = links.get(r.id) ?? [];
    const clinicNames = clinicIds.map(cid => clinicNameById.get(cid) ?? `#${cid}`);
    return {
      id: r.id,
      name: r.name ?? "",
      email: r.email,
      phone: formatUsPhoneDisplay(r.phone, ""),
      fax: formatUsPhoneDisplay(r.fax, ""),
      address: r.address,
      city: r.city,
      state: r.state,
      zip: r.zip,
      addressLine: formatAddressLine(r),
      status: r.status === 1 ? "Active" : "Inactive",
      img: r.img ?? "",
      clinicIds,
      clinicNames,
    };
  });

  return { rows, clinicOptions };
}
