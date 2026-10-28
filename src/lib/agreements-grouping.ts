import { SUPPORTED_LANGUAGES } from "@/lib/supported-languages";
import type { AgreementRecord } from "@/models/agreement.model";

/** Normalize `clinic_id` CSV (may include spaces) to sorted unique numeric string ids. */
export function normalizeAgreementClinicCsv(clinic_id: string | null): string {
  if (!clinic_id?.trim()) return "";
  return [...new Set(clinic_id.split(/[,\s]+/).map(s => s.trim()).filter(Boolean))]
    .sort((a, b) => Number(a) - Number(b))
    .join(",");
}

export type AgreementPageRow = {
  id: number;
  name: string;
  type: string;
  clinicIds: string[];
  content: Record<string, string>;
  completed: Record<string, string>;
  status: "Active" | "Inactive";
};

function pickDisplayName(r: AgreementRecord): string {
  const en = r.en_name?.trim();
  if (en) return en;
  for (const { code } of SUPPORTED_LANGUAGES) {
    const v = (r[`${code}_name` as keyof AgreementRecord] as string | null)?.trim();
    if (v) return v;
  }
  return "(Untitled)";
}

/** Map one `agreements` table row (wide multilingual columns) to the admin list row. */
export function mapAgreementRecordToPageRow(r: AgreementRecord): AgreementPageRow {
  const csv = normalizeAgreementClinicCsv(r.clinic_id);
  const clinicIds = csv ? csv.split(",") : [];
  const content: Record<string, string> = {};
  const completed: Record<string, string> = {};
  for (const { code } of SUPPORTED_LANGUAGES) {
    const desc = (r[`${code}_desc` as keyof AgreementRecord] as string | null) ?? "";
    content[code] = desc;
    completed[code] = desc.replace(/<[^>]*>/g, "").trim() ? "Yes" : "No";
  }
  return {
    id: r.id,
    name: pickDisplayName(r),
    type: r.type ?? "",
    clinicIds,
    content,
    completed,
    status: r.status === 1 ? "Active" : "Inactive",
  };
}

export function mapAgreementRecordsToPageRows(rows: AgreementRecord[]): AgreementPageRow[] {
  return rows.map(mapAgreementRecordToPageRow).sort((a, b) => a.id - b.id);
}
