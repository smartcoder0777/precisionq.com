import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { BILLING_CYCLE_CATEGORIES_COLUMNS } from "@/db/schema/education-products";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "../_crud";

const TABLE_NAME = "billing_cycle_categories";
const COLUMNS = BILLING_CYCLE_CATEGORIES_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id");

export type BillingCycleCategoryRecord = RowDataPacket & {
  id: number; category_code: string | null; category_name: string | null; description: string | null; status: number | null;
};
export type CreateBillingCycleCategoryInput = Omit<BillingCycleCategoryRecord, "id">;
export const getAllBillingCycleCategories = () => selectAll<BillingCycleCategoryRecord>(TABLE_NAME, COLUMNS);
export const getBillingCycleCategoryById = (id: number) =>
  selectById<BillingCycleCategoryRecord>(TABLE_NAME, COLUMNS, id);
export const createBillingCycleCategory = (payload: CreateBillingCycleCategoryInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);

export type BillingCycleCategoryUpdatePatch = Partial<CreateBillingCycleCategoryInput>;

export async function updateBillingCycleCategoryById(id: number, patch: BillingCycleCategoryUpdatePatch): Promise<void> {
  const pool = getPool();
  const entries: [string, string | number | null][] = [];
  for (const k of INSERT_COLUMNS) {
    const key = k as keyof BillingCycleCategoryUpdatePatch;
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

export async function deleteBillingCycleCategoryById(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE id = ? LIMIT 1`, [id]);
}
