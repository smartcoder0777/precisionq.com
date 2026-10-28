import { getAuthSession } from "@/lib/auth-session";
import * as BillingCycleCategoryModel from "@/models/settings/billing-cycle-category.model";
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

function toPayload(input: Record<string, unknown>): BillingCycleCategoryModel.CreateBillingCycleCategoryInput | null {
  const category_name = strOrNull(input.categoryName);
  if (!category_name) return null;
  return {
    category_code: strOrNull(input.categoryCode),
    category_name,
    description: strOrNull(input.description),
    status: statusToDb(input.status),
  };
}

export const billingCycleCategoriesController = {
  async create(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "settings-billing-cycle", "edit");
    if (denied) return denied;
    try {
      const payload = toPayload(input);
      if (!payload) return { status: 400, body: { ok: false, message: "Category name is required." } };
      const id = await BillingCycleCategoryModel.createBillingCycleCategory(payload);
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
    const denied = await requireRolePermission(session, "settings-billing-cycle", "edit");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) return { status: 400, body: { ok: false, message: "Invalid id." } };
    try {
      const existing = await BillingCycleCategoryModel.getBillingCycleCategoryById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Billing cycle category not found." } };
      const payload = toPayload(input);
      if (!payload) return { status: 400, body: { ok: false, message: "Category name is required." } };
      await BillingCycleCategoryModel.updateBillingCycleCategoryById(id, payload);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Update failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async remove(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "settings-billing-cycle", "edit");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) return { status: 400, body: { ok: false, message: "Invalid id." } };
    try {
      const existing = await BillingCycleCategoryModel.getBillingCycleCategoryById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Billing cycle category not found." } };
      await BillingCycleCategoryModel.deleteBillingCycleCategoryById(id);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },
};
