import "server-only";

import * as ProductCategoryModel from "@/models/settings/product-category.model";

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  return String(v);
}

function statusFromDb(n: number | null | undefined): "Active" | "Inactive" {
  return (n ?? 0) === 1 ? "Active" : "Inactive";
}

function typeFromDb(v: string | null | undefined): "product" | "service" {
  return String(v ?? "").toLowerCase() === "service" ? "service" : "product";
}

export type ProductCategorySettingsRow = {
  id: string;
  name: string;
  description: string;
  type: "product" | "service";
  status: "Active" | "Inactive";
};

export async function loadProductCategoriesPagePayload(): Promise<{
  categories: ProductCategorySettingsRow[];
}> {
  const rows = await ProductCategoryModel.getAllProductCategories();
  return {
    categories: rows.map((row) => ({
      id: String(row.id),
      name: toStr(row.name),
      description: toStr(row.description),
      type: typeFromDb(row.type),
      status: statusFromDb(row.status),
    })),
  };
}
