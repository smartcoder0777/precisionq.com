import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { PRODUCT_SERVICES_COLUMNS } from "@/db/schema/education-products";
import { getPool } from "@/lib/db";

const TABLE_NAME = "product_services";

const COLUMNS = PRODUCT_SERVICES_COLUMNS as unknown as readonly string[];

export const PRODUCT_SERVICE_INSERT_COLUMNS = COLUMNS.filter(
  (c): c is Exclude<(typeof PRODUCT_SERVICES_COLUMNS)[number], "id"> => c !== "id",
);

function qIdent(name: string): string {
  return `\`${String(name).replace(/`/g, "")}\``;
}

export type ProductServiceRecord = RowDataPacket & {
  id: number;
  type: string | null;
  category_id: number;
  name: string | null;
  short_description: string | null;
  long_description: string | null;
  base_price: string | number | null;
  currency: string | null;
  is_subscription: number | boolean | null;
  pay_type_id: number | null;
  payment_cycle_id: number | null;
  billing_cycle_category_id: number | null;
  discount_type: string | null;
  discount_value: string | number | null;
  tax_required: number | boolean | null;
  status: string | null;
  images: string | null;
  videos: string | null;
};

export type CreateProductServiceInput = Omit<ProductServiceRecord, "id">;

export async function getAllProductServices(): Promise<ProductServiceRecord[]> {
  const pool = getPool();
  const list = COLUMNS.map(qIdent).join(", ");
  const [rows] = await pool.execute<ProductServiceRecord[]>(
    `SELECT ${list} FROM ${qIdent(TABLE_NAME)} ORDER BY ${qIdent("id")} ASC`,
  );
  return rows;
}

export async function getProductServiceById(id: number): Promise<ProductServiceRecord | null> {
  const pool = getPool();
  const list = COLUMNS.map(qIdent).join(", ");
  const [rows] = await pool.execute<ProductServiceRecord[]>(
    `SELECT ${list} FROM ${qIdent(TABLE_NAME)} WHERE ${qIdent("id")} = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function createProductService(payload: CreateProductServiceInput): Promise<number> {
  const pool = getPool();
  const cols = PRODUCT_SERVICE_INSERT_COLUMNS.map(qIdent).join(", ");
  const ph = PRODUCT_SERVICE_INSERT_COLUMNS.map(() => "?").join(", ");
  const vals = PRODUCT_SERVICE_INSERT_COLUMNS.map(c => payload[c as keyof CreateProductServiceInput]);
  const [result] = await pool.execute<ResultSetHeader & { insertId: number }>(
    `INSERT INTO ${qIdent(TABLE_NAME)} (${cols}) VALUES (${ph})`,
    vals as unknown as (string | number | null | boolean)[],
  );
  return result.insertId;
}

export async function updateProductServiceById(id: number, payload: CreateProductServiceInput): Promise<void> {
  const pool = getPool();
  const setClause = PRODUCT_SERVICE_INSERT_COLUMNS.map(c => `${qIdent(c)} = ?`).join(", ");
  const vals = PRODUCT_SERVICE_INSERT_COLUMNS.map(c => payload[c as keyof CreateProductServiceInput]);
  await pool.execute<ResultSetHeader>(
    `UPDATE ${qIdent(TABLE_NAME)} SET ${setClause} WHERE ${qIdent("id")} = ? LIMIT 1`,
    [...vals, id] as unknown as (string | number | null | boolean)[],
  );
}

export async function deleteProductServiceById(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${qIdent(TABLE_NAME)} WHERE ${qIdent("id")} = ? LIMIT 1`, [id]);
}
