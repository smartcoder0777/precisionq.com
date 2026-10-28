import type { RowDataPacket } from "mysql2";
import type { ResultSetHeader } from "mysql2";
import { SURVEY_RESPONSES_COLUMNS } from "@/db/schema/surveys";
import { getPool } from "@/lib/db";

const TABLE_NAME = "survey_responses";
const COLUMNS = SURVEY_RESPONSES_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id");

function q(name: string): string {
  return `\`${name.replace(/`/g, "")}\``;
}

export type SurveyResponseRecord = RowDataPacket & {
  id: number; key: string | null; lang_id: number | null; items: string | null; status: number | null; required: number;
};
export type CreateSurveyResponseInput = Omit<SurveyResponseRecord, "id">;
export async function getAllSurveyResponses(): Promise<SurveyResponseRecord[]> {
  const pool = getPool();
  const colList = COLUMNS.map((c) => q(c)).join(", ");
  const [rows] = await pool.execute<SurveyResponseRecord[]>(
    `SELECT ${colList} FROM ${q(TABLE_NAME)} ORDER BY ${q("id")} ASC`,
  );
  return rows;
}

export async function getSurveyResponseById(id: number): Promise<SurveyResponseRecord | null> {
  const pool = getPool();
  const colList = COLUMNS.map((c) => q(c)).join(", ");
  const [rows] = await pool.execute<SurveyResponseRecord[]>(
    `SELECT ${colList} FROM ${q(TABLE_NAME)} WHERE ${q("id")} = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function createSurveyResponse(payload: CreateSurveyResponseInput): Promise<number> {
  const pool = getPool();
  const insertCols = INSERT_COLUMNS.map((c) => q(c)).join(", ");
  const placeholders = INSERT_COLUMNS.map(() => "?").join(", ");
  const values = INSERT_COLUMNS.map((column) => payload[column]);
  const [result] = await pool.execute<ResultSetHeader & { insertId: number }>(
    `INSERT INTO ${q(TABLE_NAME)} (${insertCols}) VALUES (${placeholders})`,
    values as unknown as Parameters<typeof pool.execute>[1],
  );
  return result.insertId;
}

export async function listSurveyResponsesByLang(langId: number): Promise<SurveyResponseRecord[]> {
  const pool = getPool();
  const colList = COLUMNS.map((c) => q(c)).join(", ");
  const [rows] = await pool.execute<SurveyResponseRecord[]>(
    `SELECT ${colList} FROM ${q(TABLE_NAME)} WHERE ${q("lang_id")} = ? ORDER BY ${q("id")} ASC`,
    [langId],
  );
  return rows;
}

export async function updateSurveyResponseById(
  id: number,
  payload: Partial<CreateSurveyResponseInput>,
): Promise<void> {
  const keys = Object.keys(payload) as (keyof CreateSurveyResponseInput)[];
  if (keys.length === 0) return;
  const pool = getPool();
  const setClause = keys.map((k) => `\`${String(k)}\` = ?`).join(", ");
  const values = keys.map((k) => payload[k] ?? null);
  await pool.execute<ResultSetHeader>(
    `UPDATE ${TABLE_NAME} SET ${setClause} WHERE id = ? LIMIT 1`,
    [...values, id],
  );
}

export async function listSurveyResponsesByIds(ids: number[]): Promise<SurveyResponseRecord[]> {
  const uniq = Array.from(new Set(ids.filter((n) => Number.isFinite(n) && n > 0)));
  if (uniq.length === 0) return [];
  const pool = getPool();
  const colList = COLUMNS.map((c) => q(c)).join(", ");
  const placeholders = uniq.map(() => "?").join(", ");
  const [rows] = await pool.execute<SurveyResponseRecord[]>(
    `SELECT ${colList} FROM ${q(TABLE_NAME)} WHERE ${q("id")} IN (${placeholders})`,
    uniq,
  );
  return rows;
}

export async function deleteSurveyResponseById(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE id = ? LIMIT 1`, [id]);
}
