import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { SURVEY_CATEGORIES_COLUMNS } from "@/db/schema/surveys";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "../_crud";

const TABLE_NAME = "survey_categories";
const COLUMNS = SURVEY_CATEGORIES_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id");

export type SurveyCategoryRecord = RowDataPacket & {
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
  e_status: number | null;
  status: number | null;
};
export type CreateSurveyCategoryInput = Omit<SurveyCategoryRecord, "id">;
export const getAllSurveyCategories = () => selectAll<SurveyCategoryRecord>(TABLE_NAME, COLUMNS);
export const getSurveyCategoryById = (id: number) =>
  selectById<SurveyCategoryRecord>(TABLE_NAME, COLUMNS, id);
export const createSurveyCategory = (payload: CreateSurveyCategoryInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);

export type SurveyCategoryUpdatePatch = Partial<CreateSurveyCategoryInput>;

export async function updateSurveyCategoryById(id: number, patch: SurveyCategoryUpdatePatch): Promise<void> {
  const pool = getPool();
  const entries: [string, string | number | null][] = [];
  for (const k of INSERT_COLUMNS) {
    const key = k as keyof SurveyCategoryUpdatePatch;
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

export async function deleteSurveyCategoryById(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE id = ? LIMIT 1`, [id]);
}
