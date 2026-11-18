import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";
import { ensureMarketplacePaymentTables } from "@/lib/payments/ensure-tables";

export type WithdrawalRecord = RowDataPacket & {
  id: number;
  user_id: number | null;
  wallet_id: number | null;
  amount: string | number | null;
  currency: string | null;
  asset: string | null;
  network: string | null;
  address: string | null;
  status: string | null;
  provider_ref: string | null;
  failure_reason: string | null;
  reviewed_by: number | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
};

export async function createWithdrawal(input: {
  user_id: number;
  wallet_id: number;
  amount: number;
  currency: string;
  asset: string;
  network: string;
  address: string;
  status: string;
}): Promise<number> {
  await ensureMarketplacePaymentTables();
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO withdrawals
     (user_id, wallet_id, amount, currency, asset, network, address, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.user_id,
      input.wallet_id,
      input.amount,
      input.currency,
      input.asset,
      input.network,
      input.address,
      input.status,
    ],
  );
  return result.insertId;
}

export async function getWithdrawalById(id: number): Promise<WithdrawalRecord | null> {
  await ensureMarketplacePaymentTables();
  const pool = getPool();
  const [rows] = await pool.execute<WithdrawalRecord[]>(`SELECT * FROM withdrawals WHERE id = ? LIMIT 1`, [id]);
  return rows[0] ?? null;
}

export async function updateWithdrawalById(
  id: number,
  patch: Partial<{
    status: string;
    provider_ref: string | null;
    failure_reason: string | null;
    reviewed_by: number | null;
  }>,
): Promise<void> {
  await ensureMarketplacePaymentTables();
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;
  const pool = getPool();
  const setClause = entries.map(([k]) => `\`${k}\` = ?`).join(", ");
  await pool.execute(`UPDATE withdrawals SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ? LIMIT 1`, [
    ...entries.map(([, v]) => v as string | number | null),
    id,
  ]);
}

export async function listWithdrawals(limit = 200): Promise<(WithdrawalRecord & { user_name?: string; user_email?: string })[]> {
  await ensureMarketplacePaymentTables();
  const pool = getPool();
  const [rows] = await pool.execute<(WithdrawalRecord & { user_name?: string; user_email?: string })[]>(
    `SELECT w.*, TRIM(CONCAT(COALESCE(u.fname,''),' ',COALESCE(u.lname,''))) AS user_name, u.email AS user_email
     FROM withdrawals w
     LEFT JOIN users u ON u.id = w.user_id
     ORDER BY w.id DESC
     LIMIT ?`,
    [limit],
  );
  return rows;
}

export async function listWithdrawalsForUser(userId: number, limit = 100): Promise<WithdrawalRecord[]> {
  await ensureMarketplacePaymentTables();
  const pool = getPool();
  const [rows] = await pool.execute<WithdrawalRecord[]>(
    `SELECT * FROM withdrawals WHERE user_id = ? ORDER BY id DESC LIMIT ?`,
    [userId, limit],
  );
  return rows;
}
