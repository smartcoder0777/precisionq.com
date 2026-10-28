import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { PRODUCT_CATEGORIES_COLUMNS } from "@/db/schema/education-products";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "../_crud";

const TABLE_NAME = "product_categories";
const COLUMNS = PRODUCT_CATEGORIES_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id");

export type ProductCategoryRecord = RowDataPacket & {
  id: number; name: string | null; description: string | null; type: string | null; status: number | null;
};
export type CreateProductCategoryInput = Omit<ProductCategoryRecord, "id">;
export const getAllProductCategories = () => selectAll<ProductCategoryRecord>(TABLE_NAME, COLUMNS);
export const getProductCategoryById = (id: number) =>
  selectById<ProductCategoryRecord>(TABLE_NAME, COLUMNS, id);
export const createProductCategory = (payload: CreateProductCategoryInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);

export type ProductCategoryUpdatePatch = Partial<CreateProductCategoryInput>;

export async function updateProductCategoryById(id: number, patch: ProductCategoryUpdatePatch): Promise<void> {
  const pool = getPool();
  const entries: [string, string | number | null][] = [];
  for (const k of INSERT_COLUMNS) {
    const key = k as keyof ProductCategoryUpdatePatch;
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

export async function deleteProductCategoryById(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE id = ? LIMIT 1`, [id]);
}
