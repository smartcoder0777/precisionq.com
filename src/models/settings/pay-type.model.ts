import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { PAY_TYPES_COLUMNS } from "@/db/schema/education-products";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "../_crud";

const TABLE_NAME = "pay_types";
const COLUMNS = PAY_TYPES_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id");

export type PayTypeRecord = RowDataPacket & {
  id: number; type_code: string | null; type_name: string | null; description: string | null; status: number | null;
};
export type CreatePayTypeInput = Omit<PayTypeRecord, "id">;
export const getAllPayTypes = () => selectAll<PayTypeRecord>(TABLE_NAME, COLUMNS);
export const getPayTypeById = (id: number) => selectById<PayTypeRecord>(TABLE_NAME, COLUMNS, id);
export const createPayType = (payload: CreatePayTypeInput) => insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);

export type PayTypeUpdatePatch = Partial<CreatePayTypeInput>;

export async function updatePayTypeById(id: number, patch: PayTypeUpdatePatch): Promise<void> {
  const pool = getPool();
  const entries: [string, string | number | null][] = [];
  for (const k of INSERT_COLUMNS) {
    const key = k as keyof PayTypeUpdatePatch;
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

export async function deletePayTypeById(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE id = ? LIMIT 1`, [id]);
}
