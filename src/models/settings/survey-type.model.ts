import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { SURVEY_TYPES_COLUMNS } from "@/db/schema/surveys";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "../_crud";

const TABLE_NAME = "survey_types";
const COLUMNS = SURVEY_TYPES_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id");

export type SurveyTypeRecord = RowDataPacket & {
  id: number;
  name_ar: string | null;
  name_da: string | null;
  name_de: string | null;
  name_en: string | null;
  name_es: string | null;
  name_fr: string | null;
  name_it: string | null;
  name_ja: string | null;
  name_ko: string | null;
  name_nl: string | null;
  name_pt: string | null;
  name_ru: string | null;
  name_tr: string | null;
  name_zh: string | null;
  status: number | null;
};
export type CreateSurveyTypeInput = Omit<SurveyTypeRecord, "id">;
export const getAllSurveyTypes = () => selectAll<SurveyTypeRecord>(TABLE_NAME, COLUMNS);
export const getSurveyTypeById = (id: number) => selectById<SurveyTypeRecord>(TABLE_NAME, COLUMNS, id);
export const createSurveyType = (payload: CreateSurveyTypeInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);

export type SurveyTypeUpdatePatch = Partial<CreateSurveyTypeInput>;

export async function updateSurveyTypeById(id: number, patch: SurveyTypeUpdatePatch): Promise<void> {
  const pool = getPool();
  const entries: [string, string | number | null][] = [];
  for (const k of INSERT_COLUMNS) {
    const key = k as keyof SurveyTypeUpdatePatch;
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

export async function deleteSurveyTypeById(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE id = ? LIMIT 1`, [id]);
}
