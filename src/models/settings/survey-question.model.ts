import type { RowDataPacket } from "mysql2";
import type { ResultSetHeader } from "mysql2";
import { SURVEY_QUESTIONS_COLUMNS } from "@/db/schema/surveys";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "../_crud";

const TABLE_NAME = "survey_questions";
const COLUMNS = SURVEY_QUESTIONS_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id");

export type SurveyQuestionRecord = RowDataPacket & {
  id: number; response_id: number | null; survey_id: number | null; language_id: number | null; text: string | null;
  choice_text: string | null; required: number; status: number | null;
};
export type CreateSurveyQuestionInput = Omit<SurveyQuestionRecord, "id">;
export const getAllSurveyQuestions = () => selectAll<SurveyQuestionRecord>(TABLE_NAME, COLUMNS);
export const getSurveyQuestionById = (id: number) =>
  selectById<SurveyQuestionRecord>(TABLE_NAME, COLUMNS, id);
export const createSurveyQuestion = (payload: CreateSurveyQuestionInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);

export async function listSurveyQuestionsBySurveyAndLang(
  surveyId: number,
  languageId: number,
): Promise<SurveyQuestionRecord[]> {
  const pool = getPool();
  const [rows] = await pool.execute<SurveyQuestionRecord[]>(
    `SELECT ${COLUMNS.join(", ")}
     FROM ${TABLE_NAME}
     WHERE survey_id = ? AND language_id = ?
     ORDER BY id ASC`,
    [surveyId, languageId],
  );
  return rows;
}

export async function deleteSurveyQuestionsBySurveyAndLang(
  surveyId: number,
  languageId: number,
): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(
    `DELETE FROM ${TABLE_NAME} WHERE survey_id = ? AND language_id = ?`,
    [surveyId, languageId],
  );
}

export async function updateSurveyQuestionById(
  id: number,
  patch: Partial<CreateSurveyQuestionInput>,
): Promise<void> {
  const keys = Object.keys(patch) as (keyof CreateSurveyQuestionInput)[];
  if (keys.length === 0) return;
  const pool = getPool();
  const setClause = keys.map((k) => `\`${String(k)}\` = ?`).join(", ");
  const values = keys.map((k) => patch[k] ?? null);
  await pool.execute<ResultSetHeader>(
    `UPDATE ${TABLE_NAME} SET ${setClause} WHERE id = ? LIMIT 1`,
    [...values, id],
  );
}

export async function deleteSurveyQuestionById(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE id = ? LIMIT 1`, [id]);
}
