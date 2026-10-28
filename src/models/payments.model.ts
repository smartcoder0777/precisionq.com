import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { PAYMENTS_COLUMNS } from "@/db/schema/education-products";
import { getPool } from "@/lib/db";

const TABLE_NAME = "payments";

const COLUMNS = PAYMENTS_COLUMNS as unknown as readonly string[];

export const PAYMENTS_INSERT_COLUMNS = COLUMNS.filter(
  (c): c is Exclude<(typeof PAYMENTS_COLUMNS)[number], "id"> => c !== "id",
);

function qIdent(name: string): string {
  return `\`${String(name).replace(/`/g, "")}\``;
}

export type PaymentsRecord = RowDataPacket & {
  id: number;
  order_id: number | null;
  user_id: number | null;
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
};

export type CreatePaymentsInput = Omit<PaymentsRecord, "id">;

export async function getAllPayments(): Promise<PaymentsRecord[]> {
  const pool = getPool();
  const list = COLUMNS.map(qIdent).join(", ");
  const [rows] = await pool.execute<PaymentsRecord[]>(
    `SELECT ${list} FROM ${qIdent(TABLE_NAME)} ORDER BY ${qIdent("id")} DESC`,
  );
  return rows;
}

export async function getPaymentById(id: number): Promise<PaymentsRecord | null> {
  const pool = getPool();
  const list = COLUMNS.map(qIdent).join(", ");
  const [rows] = await pool.execute<PaymentsRecord[]>(
    `SELECT ${list} FROM ${qIdent(TABLE_NAME)} WHERE ${qIdent("id")} = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function createPayment(payload: CreatePaymentsInput): Promise<number> {
  const pool = getPool();
  const cols = PAYMENTS_INSERT_COLUMNS.map(qIdent).join(", ");
  const ph = PAYMENTS_INSERT_COLUMNS.map(() => "?").join(", ");
  const vals = PAYMENTS_INSERT_COLUMNS.map(c => payload[c as keyof CreatePaymentsInput]);
  const [result] = await pool.execute<ResultSetHeader & { insertId: number }>(
    `INSERT INTO ${qIdent(TABLE_NAME)} (${cols}) VALUES (${ph})`,
    vals as unknown as (string | number | null)[],
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
