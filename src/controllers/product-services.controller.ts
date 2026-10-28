/**
 * Admin CRUD for `product_services`.
 */
import { serializeProductImages } from "@/lib/product-service-db-mapper";
import { getAuthSession } from "@/lib/auth-session";
import * as PayTypeModel from "@/models/settings/pay-type.model";
import type { CreateProductServiceInput } from "@/models/product-service.model";
import * as ProductServiceModel from "@/models/product-service.model";
import type { ProductImage } from "@/types/products-services-page";
import type { HttpResult } from "./health.controller";
import { requireRolePermission } from "./_permission";

async function unauthorized(): Promise<HttpResult<{ ok: false; message: string }>> {
  return { status: 401, body: { ok: false, message: "Unauthorized." } };
}

function strOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseId(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseImages(v: unknown): ProductImage[] {
  if (!v || !Array.isArray(v)) return [];
  const out: ProductImage[] = [];
  for (const item of v) {
    if (!item || typeof item !== "object") continue;
    const o = item as { filename?: unknown; isPrimary?: unknown };
    const filename = typeof o.filename === "string" ? o.filename.trim() : "";
    if (!filename) continue;
    out.push({ filename, isPrimary: Boolean(o.isPrimary) });
  }
  if (out.length > 0 && !out.some(i => i.isPrimary)) out[0].isPrimary = true;
  return out;
}

function toDbType(v: unknown): "product" | "service" {
  const s = String(v).toLowerCase();
  return s === "service" ? "service" : "product";
}

function toDbStatus(v: unknown): "active" | "inactive" | "draft" {
  const s = String(v).toLowerCase();
  if (s === "inactive") return "inactive";
  if (s === "draft") return "draft";
  return "active";
}

async function isSubscriptionForPayType(payTypeId: number | null): Promise<boolean> {
  if (payTypeId == null) return false;
  const rows = await PayTypeModel.getAllPayTypes();
  const pt = rows.find(r => r.id === payTypeId);
  const name = (pt?.type_name ?? "").toLowerCase();
  const code = (pt?.type_code ?? "").toLowerCase();
  return name.includes("recurring") || code.includes("recur");
}

async function bodyToPayload(input: Record<string, unknown>): Promise<CreateProductServiceInput | null> {
  const name = strOrNull(input.name);
  if (!name) return null;

  const categoryId = parseId(input.categoryId);
  if (categoryId == null) return null;

  const payTypeId = parseId(input.payTypeId);
  if (payTypeId == null) return null;

  const billingCategoryId = parseId(input.billingCategoryId);
  if (billingCategoryId == null) return null;

  const paymentCycleId = input.paymentCycleId === null || input.paymentCycleId === ""
    ? null
    : parseId(input.paymentCycleId);

  const discountPct = Math.min(100, Math.max(0, num(input.discount, 0)));
  const discount_type: "none" | "percentage" | "fixed" = discountPct > 0 ? "percentage" : "none";
  /** Many schemas use NOT NULL on `discount_value`; keep 0 when there is no discount. */
  const discount_value = discountPct > 0 ? discountPct : 0;

  const images = parseImages(input.images);
  const video = typeof input.video === "string" ? input.video.trim() : "";

  const is_subscription = await isSubscriptionForPayType(payTypeId);

  const row: CreateProductServiceInput = {
    type: toDbType(input.type ?? "product"),
    category_id: categoryId,
    name,
    short_description: strOrNull(input.shortDesc),
    long_description: strOrNull(input.longDesc),
    base_price: num(input.basePrice, 0),
    currency: strOrNull(input.currency) ?? "USD",
    is_subscription: is_subscription ? 1 : 0,
    pay_type_id: payTypeId,
    payment_cycle_id: paymentCycleId,
    billing_cycle_category_id: billingCategoryId,
    discount_type,
    discount_value,
    tax_required: input.taxRequired === true || input.taxRequired === 1 || input.taxRequired === "1" ? 1 : 0,
    status: toDbStatus(input.status ?? "active"),
    images: serializeProductImages(images),
    videos: video || null,
  };

  return row;
}

export const productServicesController = {
  async create(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "products-services", "create");
    if (denied) return denied;

    try {
      const payload = await bodyToPayload(input);
      if (!payload) {
        return {
          status: 400,
          body: { ok: false, message: "Name, category, pay type, and billing category are required." },
        };
      }
      const id = await ProductServiceModel.createProductService(payload);
      return { status: 201, body: { ok: true, id } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Create failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async update(
    id: number,
    input: Record<string, unknown>,
  ): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "products-services", "edit");
    if (denied) return denied;

    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid id." } };
    }

    try {
      const existing = await ProductServiceModel.getProductServiceById(id);
      if (!existing) {
        return { status: 404, body: { ok: false, message: "Record not found." } };
      }
      const payload = await bodyToPayload(input);
      if (!payload) {
        return {
          status: 400,
          body: { ok: false, message: "Name, category, pay type, and billing category are required." },
        };
      }
      await ProductServiceModel.updateProductServiceById(id, payload);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Update failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async remove(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "products-services", "delete");
    if (denied) return denied;

    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid id." } };
    }

    try {
      const existing = await ProductServiceModel.getProductServiceById(id);
      if (!existing) {
        return { status: 404, body: { ok: false, message: "Record not found." } };
      }
      await ProductServiceModel.deleteProductServiceById(id);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },
};
