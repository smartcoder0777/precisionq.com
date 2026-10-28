/**
 * Admin operations on `payments` (read via server page; delete via API).
 */
import { getAuthSession } from "@/lib/auth-session";
import * as PaymentsModel from "@/models/payments.model";
import type { HttpResult } from "./health.controller";
import { requireRolePermission } from "./_permission";

async function unauthorized(): Promise<HttpResult<{ ok: false; message: string }>> {
  return { status: 401, body: { ok: false, message: "Unauthorized." } };
}

export const paymentsController = {
  async remove(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "payments", "delete");
    if (denied) return denied;

    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid payment id." } };
    }

    try {
      const row = await PaymentsModel.getPaymentById(id);
      if (!row) {
        return { status: 404, body: { ok: false, message: "Payment not found." } };
      }
      await PaymentsModel.deletePaymentById(id);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async removeAll(): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "payments", "delete");
    if (denied) return denied;

    try {
      await PaymentsModel.deleteAllPayments();
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete all failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },
};
