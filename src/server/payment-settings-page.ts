import "server-only";

import { ensureMarketplacePaymentTables } from "@/lib/payments/ensure-tables";
import * as PaymentSettingsModel from "@/models/payment-settings.model";
import type { PaymentSettingsPagePayload } from "@/types/payment-settings-page";

export async function loadPaymentSettingsPagePayload(): Promise<PaymentSettingsPagePayload> {
  await ensureMarketplacePaymentTables();
  const settings = await PaymentSettingsModel.getPaymentSettings();
  return {
    platformFeePercent: Number(settings?.platform_fee_percent ?? 10),
    platformFeeFlat: Number(settings?.platform_fee_flat ?? 0),
    minWithdrawal: Number(settings?.min_withdrawal ?? 25),
    enableCard: Number(settings?.enable_card ?? 1) === 1,
    enableBank: Number(settings?.enable_bank ?? 1) === 1,
    enablePaypal: Number(settings?.enable_paypal ?? 1) === 1,
    enableCryptoOut: Number(settings?.enable_crypto_out ?? 1) === 1,
  };
}
