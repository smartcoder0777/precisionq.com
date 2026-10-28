import { getAuthSession } from "@/lib/auth-session";
import * as PaymentCycleModel from "@/models/settings/payment-cycle.model";
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

function lowerStrOrNull(v: unknown): string | null {
  const s = strOrNull(v);
  return s ? s.toLowerCase() : null;
}

function toIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function statusToDb(s: unknown): 0 | 1 {
  return s === "Active" ? 1 : 0;
}

function toPayload(input: Record<string, unknown>): PaymentCycleModel.CreatePaymentCycleInput | null {
  const cycle_name = strOrNull(input.cycleName);
  if (!cycle_name) return null;
  return {
    category_id: toIntOrNull(input.categoryId),
    cycle_code: strOrNull(input.cycleCode),
    cycle_name,
    interval_value: toIntOrNull(input.intervalValue),
    interval_unit: lowerStrOrNull(input.intervalUnit),
    is_recurring: input.isRecurring === true ? 1 : 0,
    description: strOrNull(input.description),
    status: statusToDb(input.status),
  };
}

export const paymentCyclesController = {
  async create(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "settings-payment-cycle", "edit");
    if (denied) return denied;
    try {
      const payload = toPayload(input);
      if (!payload) return { status: 400, body: { ok: false, message: "Cycle name is required." } };
      const id = await PaymentCycleModel.createPaymentCycle(payload);
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
    const denied = await requireRolePermission(session, "settings-payment-cycle", "edit");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) return { status: 400, body: { ok: false, message: "Invalid id." } };
    try {
      const existing = await PaymentCycleModel.getPaymentCycleById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Payment cycle not found." } };
      const payload = toPayload(input);
      if (!payload) return { status: 400, body: { ok: false, message: "Cycle name is required." } };
      await PaymentCycleModel.updatePaymentCycleById(id, payload);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Update failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async remove(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "settings-payment-cycle", "edit");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) return { status: 400, body: { ok: false, message: "Invalid id." } };
    try {
      const existing = await PaymentCycleModel.getPaymentCycleById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Payment cycle not found." } };
      await PaymentCycleModel.deletePaymentCycleById(id);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },
};
