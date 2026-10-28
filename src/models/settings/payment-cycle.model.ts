import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { PAYMENT_CYCLES_COLUMNS } from "@/db/schema/education-products";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "../_crud";

const TABLE_NAME = "payment_cycles";
const COLUMNS = PAYMENT_CYCLES_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((column) => column !== "id");

export type PaymentCycleRecord = RowDataPacket & {
  id: number; category_id: number | null; cycle_code: string | null; cycle_name: string | null; interval_value: number | null;
  interval_unit: string | null; is_recurring: number | null; description: string | null; status: number | null;
};
export type CreatePaymentCycleInput = Omit<PaymentCycleRecord, "id">;
export const getAllPaymentCycles = () => selectAll<PaymentCycleRecord>(TABLE_NAME, COLUMNS);
export const getPaymentCycleById = (id: number) => selectById<PaymentCycleRecord>(TABLE_NAME, COLUMNS, id);
export const createPaymentCycle = (payload: CreatePaymentCycleInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);

export type PaymentCycleUpdatePatch = Partial<CreatePaymentCycleInput>;

export async function updatePaymentCycleById(id: number, patch: PaymentCycleUpdatePatch): Promise<void> {
  const pool = getPool();
  const entries: [string, string | number | null][] = [];
  for (const k of INSERT_COLUMNS) {
    const key = k as keyof PaymentCycleUpdatePatch;
    if (patch[key] !== undefined) entries.push([k, patch[key]!]);
  }
  if (entries.length === 0) return;
  const setClause = entries.map(([k]) => `\`${k}\` = ?`).join(", ");
  const vals = entries.map(([, v]) => v);
  await pool.execute<ResultSetHeader>(
    `UPDATE ${TABLE_NAME} SET ${setClause} WHERE id = ? LIMIT 1`,
    [...vals, id] as unknown as (string | number | null)[],
  );
}

export async function deletePaymentCycleById(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE id = ? LIMIT 1`, [id]);
}
