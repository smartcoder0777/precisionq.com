import { getAuthSession } from "@/lib/auth-session";
import * as ProductCategoryModel from "@/models/settings/product-category.model";
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

function statusToDb(s: unknown): 0 | 1 {
  return s === "Active" ? 1 : 0;
}

function typeToDb(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "service") return "service";
  return "product";
}

function toCategoryPayload(input: Record<string, unknown>): ProductCategoryModel.CreateProductCategoryInput | null {
  const name = strOrNull(input.name);
  if (!name) return null;
  const payload: ProductCategoryModel.CreateProductCategoryInput = {
    name,
    description: strOrNull(input.description),
    type: typeToDb(input.type),
    status: statusToDb(input.status),
  };
  return payload;
}

export const productCategoriesController = {
  async create(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "settings-product-category", "edit");
    if (denied) return denied;

    try {
      const payload = toCategoryPayload(input);
      if (!payload) return { status: 400, body: { ok: false, message: "Category name is required." } };
      const id = await ProductCategoryModel.createProductCategory(payload);
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
    const denied = await requireRolePermission(session, "settings-product-category", "edit");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid category id." } };
    }
    try {
      const existing = await ProductCategoryModel.getProductCategoryById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Category not found." } };
      const payload = toCategoryPayload(input);
      if (!payload) return { status: 400, body: { ok: false, message: "Category name is required." } };
      await ProductCategoryModel.updateProductCategoryById(id, payload);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Update failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async remove(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "settings-product-category", "edit");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid category id." } };
    }
    try {
      const existing = await ProductCategoryModel.getProductCategoryById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Category not found." } };
      await ProductCategoryModel.deleteProductCategoryById(id);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },
};
