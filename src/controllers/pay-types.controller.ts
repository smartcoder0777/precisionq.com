import { getAuthSession } from "@/lib/auth-session";
import * as PayTypeModel from "@/models/settings/pay-type.model";
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

function toPayload(input: Record<string, unknown>): PayTypeModel.CreatePayTypeInput | null {
  const type_name = strOrNull(input.typeName);
  if (!type_name) return null;
  return {
    type_code: strOrNull(input.typeCode),
    type_name,
    description: strOrNull(input.description),
    status: statusToDb(input.status),
  };
}

export const payTypesController = {
  async create(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "settings-pay-type", "edit");
    if (denied) return denied;
    try {
      const payload = toPayload(input);
      if (!payload) return { status: 400, body: { ok: false, message: "Type name is required." } };
      const id = await PayTypeModel.createPayType(payload);
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
    const denied = await requireRolePermission(session, "settings-pay-type", "edit");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) return { status: 400, body: { ok: false, message: "Invalid id." } };
    try {
      const existing = await PayTypeModel.getPayTypeById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Pay type not found." } };
      const payload = toPayload(input);
      if (!payload) return { status: 400, body: { ok: false, message: "Type name is required." } };
      await PayTypeModel.updatePayTypeById(id, payload);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Update failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async remove(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "settings-pay-type", "edit");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) return { status: 400, body: { ok: false, message: "Invalid id." } };
    try {
      const existing = await PayTypeModel.getPayTypeById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Pay type not found." } };
      await PayTypeModel.deletePayTypeById(id);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },
};
