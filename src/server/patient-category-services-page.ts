import "server-only";

import { SUPPORTED_LANGUAGES } from "@/lib/supported-languages";
import * as PatientServiceCategoryModel from "@/models/patient-service-category.model";
import * as PatientServiceModel from "@/models/patient-service.model";
import type {
  PatientCategoryServiceRow,
  PatientCategoryServicesPagePayload,
} from "@/types/patient-category-services-page";

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

function serviceRowToPage(row: PatientServiceModel.PatientServiceRecord): PatientCategoryServiceRow {
  const names: Record<string, string> = {};
  const descriptions: Record<string, string> = {};
  const details: Record<string, string> = {};
  for (const code of LANG_CODES) {
    names[code] = toStr(row[`${code}_name` as keyof PatientServiceModel.PatientServiceRecord]);
    descriptions[code] = toStr(row[`${code}_desc` as keyof PatientServiceModel.PatientServiceRecord]);
    details[code] = toStr(row[`${code}_detail` as keyof PatientServiceModel.PatientServiceRecord]);
  }
  return {
    id: String(row.id),
    categoryId: String(row.category_id ?? ""),
    names,
    descriptions,
    details,
    contact: toStr(row.contact),
    image: row.image,
    status: statusFromDb(row.status),
  };
}

export async function loadPatientCategoryServicesPage(
  categoryId: number,
): Promise<PatientCategoryServicesPagePayload | null> {
  if (!Number.isFinite(categoryId) || categoryId <= 0) return null;
  const cat = await PatientServiceCategoryModel.getPatientServiceCategoryById(categoryId);
  if (!cat) return null;
  const categoryNameEn = toStr(cat.en_name).trim() || `Category ${categoryId}`;
  const svcRows = await PatientServiceModel.getPatientServicesByCategoryId(categoryId);
  return {
    categoryId: String(categoryId),
    categoryNameEn,
    services: svcRows.map(serviceRowToPage),
  };
}
