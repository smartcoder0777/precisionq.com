import { getAuthSession, touchAuthSession } from "@/lib/auth-session";
import { ensureMarketplacePaymentTables } from "@/lib/payments/ensure-tables";
import * as PaymentSettingsModel from "@/models/payment-settings.model";
import type { HttpResult } from "./health.controller";
import { requireRolePermission } from "./_permission";

async function unauthorized(): Promise<HttpResult<{ ok: false; message: string }>> {
  return { status: 401, body: { ok: false, message: "Unauthorized." } };
}

export const paymentSettingsController = {
  async get(): Promise<HttpResult<{ ok: boolean; settings?: unknown; message?: string }>> {
    await ensureMarketplacePaymentTables();
    const session = await getAuthSession();
    if (!session) return unauthorized();
    await touchAuthSession(session);
    const denied = await requireRolePermission(session, "settings-payments", "view");
    if (denied) return denied;
    const settings = await PaymentSettingsModel.getPaymentSettings();
    return { status: 200, body: { ok: true, settings } };
  },

  async update(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    await ensureMarketplacePaymentTables();
    const session = await getAuthSession();
    if (!session) return unauthorized();
    await touchAuthSession(session);
    const denied = await requireRolePermission(session, "settings-payments", "edit");
    if (denied) return denied;

    try {
      await PaymentSettingsModel.updatePaymentSettings({
        platform_fee_percent:
          input.platformFeePercent !== undefined ? Number(input.platformFeePercent) : undefined,
        platform_fee_flat: input.platformFeeFlat !== undefined ? Number(input.platformFeeFlat) : undefined,
        min_withdrawal: input.minWithdrawal !== undefined ? Number(input.minWithdrawal) : undefined,
        enable_card: input.enableCard === false || input.enableCard === 0 || input.enableCard === "0" ? 0 : input.enableCard !== undefined ? 1 : undefined,
        enable_bank: input.enableBank === false || input.enableBank === 0 || input.enableBank === "0" ? 0 : input.enableBank !== undefined ? 1 : undefined,
        enable_paypal: input.enablePaypal === false || input.enablePaypal === 0 || input.enablePaypal === "0" ? 0 : input.enablePaypal !== undefined ? 1 : undefined,
        enable_crypto_out:
          input.enableCryptoOut === false || input.enableCryptoOut === 0 || input.enableCryptoOut === "0"
            ? 0
            : input.enableCryptoOut !== undefined
              ? 1
              : undefined,
      });
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Update failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },
};
