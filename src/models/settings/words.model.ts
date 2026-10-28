import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { WORDS_COLUMNS } from "@/db/schema/settings-ref";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "../_crud";

const TABLE_NAME = "words";
const COLUMNS = WORDS_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id");

export type WordRecord = RowDataPacket & {
  id: number; code: string | null; color: string; display: string | null; description: string | null;
};
export type CreateWordInput = Omit<WordRecord, "id">;
export const getAllWords = () => selectAll<WordRecord>(TABLE_NAME, COLUMNS);
export const getWordById = (id: number) => selectById<WordRecord>(TABLE_NAME, COLUMNS, id);
export const createWord = (payload: CreateWordInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);

export type WordUpdatePatch = Partial<CreateWordInput>;

export async function updateWordById(id: number, patch: WordUpdatePatch): Promise<void> {
  const pool = getPool();
  const entries: [string, string | number | null][] = [];
  for (const k of INSERT_COLUMNS) {
    const key = k as keyof WordUpdatePatch;
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

export async function deleteWordById(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE id = ? LIMIT 1`, [id]);
}

export async function updateAllWordsColor(color: string): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`UPDATE ${TABLE_NAME} SET \`color\` = ?`, [color]);
}
