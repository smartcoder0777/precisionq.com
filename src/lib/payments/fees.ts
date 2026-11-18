import "server-only";

import * as PaymentSettingsModel from "@/models/payment-settings.model";

export type FeeSplit = {
  gross: number;
  platformFee: number;
  sellerNet: number;
};

export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export async function computeFeeSplit(grossAmount: number): Promise<FeeSplit> {
  const settings = await PaymentSettingsModel.getPaymentSettings();
  const pct = Number(settings?.platform_fee_percent ?? 10);
  const flat = Number(settings?.platform_fee_flat ?? 0);
  const gross = roundMoney(Math.max(0, grossAmount));
  const platformFee = roundMoney(Math.min(gross, (gross * (Number.isFinite(pct) ? pct : 0)) / 100 + (Number.isFinite(flat) ? flat : 0)));
  const sellerNet = roundMoney(Math.max(0, gross - platformFee));
  return { gross, platformFee, sellerNet };
}
