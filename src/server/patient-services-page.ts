import "server-only";

import { SUPPORTED_LANGUAGES } from "@/lib/supported-languages";
import * as PatientServiceCategoryModel from "@/models/patient-service-category.model";
import type { PatientServicesCategoryRow, PatientServicesPagePayload } from "@/types/patient-services-page";

const LANG_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  return String(v);
}

function statusFromDb(n: number | null | undefined): "Active" | "Inactive" {
  return (n ?? 0) === 1 ? "Active" : "Inactive";
}

function categoryRowToPage(row: PatientServiceCategoryModel.PatientServiceCategoryRecord): PatientServicesCategoryRow {
  const names: Record<string, string> = {};
  for (const code of LANG_CODES) {
    const col = `${code}_name` as keyof PatientServiceCategoryModel.PatientServiceCategoryRecord;
    names[code] = toStr(row[col]);
  }
  return {
    id: String(row.id),
    names,
    status: statusFromDb(row.status),
  };
}

export async function loadPatientServicesPagePayload(): Promise<PatientServicesPagePayload> {
  const catRows = await PatientServiceCategoryModel.getAllPatientServiceCategories();
  return {
    categories: catRows.map(categoryRowToPage),
  };
}
