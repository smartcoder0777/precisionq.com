import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";
import { ensureMarketplacePaymentTables } from "@/lib/payments/ensure-tables";

export type PaymentSettingsRecord = RowDataPacket & {
  id: number;
  platform_fee_percent: string | number | null;
  platform_fee_flat: string | number | null;
  min_withdrawal: string | number | null;
  enable_card: number | null;
  enable_bank: number | null;
  enable_paypal: number | null;
  enable_crypto_out: number | null;
};

export async function getPaymentSettings(): Promise<PaymentSettingsRecord | null> {
  await ensureMarketplacePaymentTables();
  const pool = getPool();
  const [rows] = await pool.execute<PaymentSettingsRecord[]>(
    `SELECT * FROM payment_settings ORDER BY id ASC LIMIT 1`,
  );
  return rows[0] ?? null;
}

export type PaymentSettingsPatch = {
  platform_fee_percent?: number;
  platform_fee_flat?: number;
  min_withdrawal?: number;
  enable_card?: number;
  enable_bank?: number;
  enable_paypal?: number;
  enable_crypto_out?: number;
};

export async function updatePaymentSettings(patch: PaymentSettingsPatch): Promise<void> {
  await ensureMarketplacePaymentTables();
  const existing = await getPaymentSettings();
  if (!existing) throw new Error("Payment settings row missing.");
  const pool = getPool();
  await pool.execute<ResultSetHeader>(
    `UPDATE payment_settings SET
      platform_fee_percent = ?,
      platform_fee_flat = ?,
      min_withdrawal = ?,
      enable_card = ?,
      enable_bank = ?,
      enable_paypal = ?,
      enable_crypto_out = ?,
      updatedAt = CURRENT_TIMESTAMP
     WHERE id = ? LIMIT 1`,
    [
      patch.platform_fee_percent ?? existing.platform_fee_percent,
      patch.platform_fee_flat ?? existing.platform_fee_flat,
      patch.min_withdrawal ?? existing.min_withdrawal,
      patch.enable_card ?? existing.enable_card,
      patch.enable_bank ?? existing.enable_bank,
      patch.enable_paypal ?? existing.enable_paypal,
      patch.enable_crypto_out ?? existing.enable_crypto_out,
      existing.id,
    ],
  );
}
