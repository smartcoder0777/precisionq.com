import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";

export type DbRecord = Record<string, unknown>;

export async function selectAll<T extends RowDataPacket>(
  tableName: string,
  columns: readonly string[],
): Promise<T[]> {
  const pool = getPool();
  const [rows] = await pool.execute<T[]>(`SELECT ${columns.join(", ")} FROM ${tableName}`);
  return rows;
}

export async function selectById<T extends RowDataPacket>(
  tableName: string,
  columns: readonly string[],
  id: number,
): Promise<T | null> {
  const pool = getPool();
  const [rows] = await pool.execute<T[]>(
    `SELECT ${columns.join(", ")} FROM ${tableName} WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function insertRecord<T extends DbRecord>(
  tableName: string,
  insertColumns: readonly string[],
  payload: T,
): Promise<number> {
  const pool = getPool();
  const placeholders = insertColumns.map(() => "?").join(", ");
  const values = insertColumns.map((column) => payload[column]);
  const [result] = await pool.execute<ResultSetHeader & { insertId: number }>(
    `INSERT INTO ${tableName} (${insertColumns.join(", ")}) VALUES (${placeholders})`,
    values as unknown as Parameters<typeof pool.execute>[1],
  );
  return result.insertId;
}
