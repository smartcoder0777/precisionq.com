import "server-only";

import { SUPPORTED_LANGUAGES } from "@/lib/supported-languages";
import * as EducationCategoryModel from "@/models/settings/education-category.model";

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

export type EducationCategorySettingsRow = {
  id: string;
  parentMenu: string;
  names: Record<string, string>;
  status: "Active" | "Inactive";
};

export async function loadEducationCategoriesPagePayload(): Promise<{
  categories: EducationCategorySettingsRow[];
}> {
  const rows = await EducationCategoryModel.getAllEducationCategories();
  return {
    categories: rows.map((row) => {
      const names: Record<string, string> = {};
      for (const code of LANG_CODES) {
        const col = `text_${code}` as keyof EducationCategoryModel.EducationCategoryRecord;
        names[code] = toStr(row[col]);
      }
      return {
        id: String(row.id),
        parentMenu: toStr(row.parent_menu),
        names,
        status: statusFromDb(row.status),
      };
    }),
  };
}
