import "server-only";

import * as BillingCycleCategoryModel from "@/models/settings/billing-cycle-category.model";

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  return String(v);
}

function statusFromDb(n: number | null | undefined): "Active" | "Inactive" {
  return (n ?? 0) === 1 ? "Active" : "Inactive";
}

export type BillingCycleCategorySettingsRow = {
  id: string;
  categoryCode: string;
  categoryName: string;
  description: string;
  status: "Active" | "Inactive";
};

export async function loadBillingCycleCategoriesPagePayload(): Promise<{ rows: BillingCycleCategorySettingsRow[] }> {
  const rows = await BillingCycleCategoryModel.getAllBillingCycleCategories();
  return {
    rows: rows.map((row) => ({
      id: String(row.id),
      categoryCode: toStr(row.category_code),
      categoryName: toStr(row.category_name),
      description: toStr(row.description),
      status: statusFromDb(row.status),
    })),
  };
}
