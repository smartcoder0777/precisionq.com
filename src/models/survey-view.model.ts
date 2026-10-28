import type { RowDataPacket } from "mysql2";
import type { ResultSetHeader } from "mysql2";
import { SURVEY_VIEWS_COLUMNS } from "@/db/schema/surveys";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "./_crud";

const TABLE_NAME = "survey_views";
const COLUMNS = SURVEY_VIEWS_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id");

export type SurveyViewRecord = RowDataPacket & {
  id: number;
  survey_id: number | null;
  completed: number;
  lang_id: number | null;
  view: string | null;
};

export type CreateSurveyViewInput = Omit<SurveyViewRecord, "id">;
export const getAllSurveyViews = () => selectAll<SurveyViewRecord>(TABLE_NAME, COLUMNS);
export const getSurveyViewById = (id: number) => selectById<SurveyViewRecord>(TABLE_NAME, COLUMNS, id);
export const createSurveyView = (payload: CreateSurveyViewInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);

export async function getSurveyViewBySurveyAndLang(
  surveyId: number,
  langId: number,
): Promise<SurveyViewRecord | null> {
  const pool = getPool();
  const [rows] = await pool.execute<SurveyViewRecord[]>(
    `SELECT ${COLUMNS.join(", ")} FROM ${TABLE_NAME} WHERE survey_id = ? AND lang_id = ? LIMIT 1`,
    [surveyId, langId],
  );
  return rows[0] ?? null;
}

export async function updateSurveyViewById(
  id: number,
  patch: Partial<CreateSurveyViewInput>,
): Promise<void> {
  const keys = Object.keys(patch) as (keyof CreateSurveyViewInput)[];
  if (keys.length === 0) return;
  const pool = getPool();
  const setClause = keys.map((k) => `\`${String(k)}\` = ?`).join(", ");
  const values = keys.map((k) => patch[k] ?? null);
  await pool.execute<ResultSetHeader>(
    `UPDATE ${TABLE_NAME} SET ${setClause} WHERE id = ? LIMIT 1`,
    [...values, id],
  );
}
