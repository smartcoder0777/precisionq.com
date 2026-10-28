import "server-only";

import { SUPPORTED_LANGUAGES } from "@/lib/supported-languages";
import * as CommunityServiceCategoryModel from "@/models/community-service-category.model";
import * as CommunityServiceModel from "@/models/community-service.model";
import * as ClinicModel from "@/models/clinic.model";
import { formatUsPhoneDisplay } from "@/lib/phone-format";
import type {
  CommunityServicesCategoryRow,
  CommunityServicesClinicOption,
  CommunityServicesPagePayload,
  CommunityServicesServiceRow,
} from "@/types/community-services-page";

const LANG_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  return String(v);
}

function splitCommaIds(v: string | null | undefined): string[] {
  if (v === null || v === undefined) return [];
  const s = String(v).trim();
  if (!s) return [];
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

function statusFromDb(n: number | null | undefined): "Active" | "Inactive" {
  return (n ?? 0) === 1 ? "Active" : "Inactive";
}

function categoryRowToPage(row: CommunityServiceCategoryModel.CommunityServiceCategoryRecord): CommunityServicesCategoryRow {
  const names: Record<string, string> = {};
  for (const code of LANG_CODES) {
    const col = `${code}_name` as keyof CommunityServiceCategoryModel.CommunityServiceCategoryRecord;
    names[code] = toStr(row[col]);
  }
  return {
    id: String(row.id),
    names,
    status: statusFromDb(row.status),
  };
}

function serviceRowToPage(row: CommunityServiceModel.CommunityServiceRecord): CommunityServicesServiceRow {
  const names: Record<string, string> = {};
  const descriptions: Record<string, string> = {};
  const details: Record<string, string> = {};
  for (const code of LANG_CODES) {
    names[code] = toStr(row[`${code}_name` as keyof CommunityServiceModel.CommunityServiceRecord]);
    descriptions[code] = toStr(row[`${code}_desc` as keyof CommunityServiceModel.CommunityServiceRecord]);
    details[code] = toStr(row[`${code}_detail` as keyof CommunityServiceModel.CommunityServiceRecord]);
  }
  return {
    id: String(row.id),
    categoryIds: splitCommaIds(row.category),
    image: row.image,
    names,
    descriptions,
    details,
    address1: toStr(row.address_1),
    address2: toStr(row.address_2),
    city: toStr(row.city),
    state: toStr(row.state),
    zip: toStr(row.zip),
    country: toStr(row.country),
    phone: formatUsPhoneDisplay(row.phone, ""),
    fax: formatUsPhoneDisplay(row.fax, ""),
    email: toStr(row.email),
    link: toStr(row.link),
    additional: toStr(row.additional),
    clinicIds: splitCommaIds(row.clinic_allowance),
    status: statusFromDb(row.status),
  };
}

export async function loadCommunityServicesPagePayload(): Promise<CommunityServicesPagePayload> {
  const [catRows, svcRows, clinicRows] = await Promise.all([
    CommunityServiceCategoryModel.getAllCommunityServiceCategories(),
    CommunityServiceModel.getAllCommunityServices(),
    ClinicModel.getAllClinics(),
  ]);

  const clinics: CommunityServicesClinicOption[] = clinicRows.map((c) => ({
    id: String(c.id),
    name: toStr(c.name) || `Clinic ${c.id}`,
  }));

  return {
    categories: catRows.map(categoryRowToPage),
    services: svcRows.map(serviceRowToPage),
    clinics,
  };
}
