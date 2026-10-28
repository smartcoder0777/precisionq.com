import type { ProductServiceRecord } from "@/models/product-service.model";
import type { ProductImage, ProductServicePageRow } from "@/types/products-services-page";

export function parseProductImages(json: string | null): ProductImage[] {
  if (!json?.trim()) return [];
  try {
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) return [];
    const out: ProductImage[] = [];
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const o = item as { filename?: unknown; isPrimary?: unknown };
      const filename = typeof o.filename === "string" ? o.filename.trim() : "";
      if (!filename) continue;
      out.push({ filename, isPrimary: Boolean(o.isPrimary) });
    }
    if (out.length > 0 && !out.some(i => i.isPrimary)) out[0].isPrimary = true;
    return out;
  } catch {
    return [];
  }
}

export function serializeProductImages(images: ProductImage[]): string {
  return JSON.stringify(images);
}

function boolFromDb(v: unknown): boolean {
  return v === true || v === 1 || v === "1";
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function displayType(t: string | null): "Product" | "Service" {
  return (t ?? "").toLowerCase() === "service" ? "Service" : "Product";
}

function displayStatus(s: string | null): "Active" | "Inactive" | "Draft" {
  const x = (s ?? "").toLowerCase();
  if (x === "inactive") return "Inactive";
  if (x === "draft") return "Draft";
  return "Active";
}

function discountPercent(r: ProductServiceRecord): number {
  const dt = (r.discount_type ?? "").toLowerCase();
  if (dt !== "percentage") return 0;
  const v = num(r.discount_value);
  return v > 0 ? v : 0;
}

function idOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export type ProductServiceLookupFns = {
  categoryName: (categoryId: number) => string;
  payTypeLabel: (payTypeId: number | null) => string;
  paymentCycleLabel: (cycleId: number | null) => string;
  billingCategoryLabel: (billingId: number | null) => string;
};

export function productServiceRecordToPageRow(
  r: ProductServiceRecord,
  lookups: ProductServiceLookupFns,
): ProductServicePageRow {
  const categoryId = idOrNull(r.category_id) ?? 0;
  const payTypeId = idOrNull(r.pay_type_id);
  const paymentCycleId = idOrNull(r.payment_cycle_id);
  const billingCategoryId = idOrNull(r.billing_cycle_category_id);

  return {
    id: num(r.id),
    name: (r.name ?? "").trim(),
    type: displayType(r.type),
    categoryId,
    categoryName: lookups.categoryName(categoryId),
    shortDesc: (r.short_description ?? "").trim(),
    longDesc: (r.long_description ?? "").trim(),
    basePrice: num(r.base_price),
    discount: discountPercent(r),
    payTypeId,
    payTypeLabel: lookups.payTypeLabel(payTypeId),
    paymentCycleId,
    paymentCycleLabel: paymentCycleId != null ? lookups.paymentCycleLabel(paymentCycleId) : "",
    billingCategoryId,
    billingCategoryLabel: billingCategoryId != null ? lookups.billingCategoryLabel(billingCategoryId) : "",
    images: parseProductImages(r.images),
    video: (r.videos ?? "").trim(),
    status: displayStatus(r.status),
    taxRequired: boolFromDb(r.tax_required),
  };
}
