import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { SETTINGS_COLUMNS } from "@/db/schema/settings-ref";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "./_crud";

const TABLE_NAME = "settings";
const COLUMNS = SETTINGS_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id");

export type SettingRecord = RowDataPacket & {
  id: number;
  code: string | null;
  display: string | null;
  detail: string | null;
};

export type CreateSettingInput = Omit<SettingRecord, "id">;
export const getAllSettings = () => selectAll<SettingRecord>(TABLE_NAME, COLUMNS);
export const getSettingById = (id: number) => selectById<SettingRecord>(TABLE_NAME, COLUMNS, id);
export const createSetting = (payload: CreateSettingInput) => insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);

export async function getSettingsByCodes(codes: string[]): Promise<SettingRecord[]> {
  if (codes.length === 0) return [];
  const pool = getPool();
  const placeholders = codes.map(() => "?").join(", ");
  const [rows] = await pool.execute<SettingRecord[]>(
    `SELECT ${COLUMNS.join(", ")} FROM ${TABLE_NAME} WHERE code IN (${placeholders})`,
    codes,
  );
  return rows;
}

export async function upsertSettingByCode(input: { code: string; display: string; detail: string }): Promise<void> {
  const pool = getPool();
  const [rows] = await pool.execute<SettingRecord[]>(
    `SELECT ${COLUMNS.join(", ")} FROM ${TABLE_NAME} WHERE code = ? LIMIT 1`,
    [input.code],
  );
  const existing = rows[0];
  if (!existing) {
    await pool.execute<ResultSetHeader>(
      `INSERT INTO ${TABLE_NAME} (code, display, detail) VALUES (?, ?, ?)`,
      [input.code, input.display, input.detail],
    );
    return;
  }
  await pool.execute<ResultSetHeader>(
    `UPDATE ${TABLE_NAME} SET display = ?, detail = ? WHERE id = ? LIMIT 1`,
    [input.display, input.detail, existing.id],
  );
}
