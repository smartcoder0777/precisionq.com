import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";
import { ensureMarketplacePaymentTables } from "@/lib/payments/ensure-tables";

const TABLE_NAME = "payments";

function qIdent(name: string): string {
  return `\`${String(name).replace(/`/g, "")}\``;
}

export type PaymentsRecord = RowDataPacket & {
  id: number;
  order_id: number | null;
  user_id: number | null;
  provider: string | null;
  provider_ref: string | null;
  method: string | null;
  stripe_payment_intent_id: string | null;
  stripe_payment_method_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  amount: string | number | null;
  currency: string | null;
  card_last4: string | null;
  card_exp_month: number | null;
  card_exp_year: number | null;
  status: string | null;
  failure_reason: string | null;
  createdAt?: string | Date | null;
};

export type CreatePaymentsInput = {
  order_id: number | null;
  user_id: number | null;
  provider: string | null;
  provider_ref: string | null;
  method: string | null;
  stripe_payment_intent_id: string | null;
  stripe_payment_method_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  amount: number | string | null;
  currency: string | null;
  card_last4: string | null;
  card_exp_month: number | null;
  card_exp_year: number | null;
  status: string | null;
  failure_reason: string | null;
};

export async function getAllPayments(): Promise<PaymentsRecord[]> {
  await ensureMarketplacePaymentTables();
  const pool = getPool();
  const [rows] = await pool.execute<PaymentsRecord[]>(
    `SELECT * FROM ${qIdent(TABLE_NAME)} ORDER BY ${qIdent("id")} DESC`,
  );
  return rows;
}

export async function getPaymentById(id: number): Promise<PaymentsRecord | null> {
  await ensureMarketplacePaymentTables();
  const pool = getPool();
  const [rows] = await pool.execute<PaymentsRecord[]>(
    `SELECT * FROM ${qIdent(TABLE_NAME)} WHERE ${qIdent("id")} = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function createPayment(payload: CreatePaymentsInput): Promise<number> {
  await ensureMarketplacePaymentTables();
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO ${qIdent(TABLE_NAME)}
     (order_id, user_id, provider, provider_ref, method, stripe_payment_intent_id, stripe_payment_method_id,
      name, email, phone, country, amount, currency, card_last4, card_exp_month, card_exp_year, status, failure_reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.order_id,
      payload.user_id,
      payload.provider,
      payload.provider_ref,
      payload.method,
      payload.stripe_payment_intent_id,
      payload.stripe_payment_method_id,
      payload.name,
      payload.email,
      payload.phone,
      payload.country,
      payload.amount,
      payload.currency,
      payload.card_last4,
      payload.card_exp_month,
      payload.card_exp_year,
      payload.status,
      payload.failure_reason,
    ],
  );
  return result.insertId;
}

export async function deletePaymentById(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${qIdent(TABLE_NAME)} WHERE ${qIdent("id")} = ? LIMIT 1`, [id]);
}

export async function deleteAllPayments(): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${qIdent(TABLE_NAME)}`);
}
