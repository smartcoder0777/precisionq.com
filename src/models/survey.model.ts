import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";

const TABLE_NAME = "surveys";
const BASE_COL = ["id", "cate_id", "type_id", "name", "desc", "page_length", "status"] as const;
let surveyLangColumnCache: "lang_id" | "language_id" | null = null;

export type SurveyRecord = RowDataPacket & {
  id: number;
  lang_id: number | null;
  cate_id: number | null;
  type_id: number | null;
  name: string | null;
  desc: string | null;
  page_length: number;
  status: number | null;
};

export type SurveyListRow = SurveyRecord & {
  lang_code: string | null;
  lang_label: string | null;
  category_name: string | null;
  type_name: string | null;
};

export type CreateSurveyInput = {
  lang_id: number | null;
  cate_id: number | null;
  type_id: number | null;
  name: string | null;
  desc: string | null;
  page_length: number;
  status: number | null;
};

async function getSurveyLanguageColumn(): Promise<"lang_id" | "language_id"> {
  if (surveyLangColumnCache) return surveyLangColumnCache;
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND column_name IN ('lang_id', 'language_id')`,
    [TABLE_NAME],
  );
  const found = rows.map((r) => String(r.column_name));
  if (found.includes("lang_id")) {
    surveyLangColumnCache = "lang_id";
    return surveyLangColumnCache;
  }
  surveyLangColumnCache = "language_id";
  return surveyLangColumnCache;
}

export async function listSurveysForAdmin(): Promise<SurveyListRow[]> {
  const pool = getPool();
  const langCol = await getSurveyLanguageColumn();
  const baseCols = BASE_COL.map((c) => (c === "desc" ? `s.\`desc\` AS \`desc\`` : `s.${c}`)).join(", ");
  const [rows] = await pool.execute<SurveyListRow[]>(
    `SELECT ${baseCols},
            s.${langCol} AS lang_id,
            l.code AS lang_code,
            COALESCE(NULLIF(TRIM(l.english), ''), l.code) AS lang_label,
            sc.name_en AS category_name,
            st.name_en AS type_name
     FROM ${TABLE_NAME} s
     LEFT JOIN languages l ON l.id = s.${langCol}
     LEFT JOIN survey_categories sc ON sc.id = s.cate_id
     LEFT JOIN survey_types st ON st.id = s.type_id
     ORDER BY s.id DESC`,
  );
  return rows;
}

export async function getSurveyById(id: number): Promise<SurveyRecord | null> {
  const pool = getPool();
  const langCol = await getSurveyLanguageColumn();
  const cols = BASE_COL.map((c) => (c === "desc" ? "`desc` AS `desc`" : c)).join(", ");
  const [rows] = await pool.execute<SurveyRecord[]>(
    `SELECT ${cols}, ${langCol} AS lang_id FROM ${TABLE_NAME} WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function insertSurvey(payload: CreateSurveyInput): Promise<number> {
  const pool = getPool();
  const langCol = await getSurveyLanguageColumn();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO ${TABLE_NAME} (\`${langCol}\`, \`cate_id\`, \`type_id\`, \`name\`, \`desc\`, \`page_length\`, \`status\`)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.lang_id,
      payload.cate_id,
      payload.type_id,
      payload.name,
      payload.desc,
      payload.page_length,
      payload.status,
    ],
  );
  return result.insertId;
}

export async function updateSurvey(id: number, payload: CreateSurveyInput): Promise<void> {
  const pool = getPool();
  const langCol = await getSurveyLanguageColumn();
  await pool.execute(
    `UPDATE ${TABLE_NAME}
     SET \`${langCol}\` = ?, \`cate_id\` = ?, \`type_id\` = ?, \`name\` = ?, \`desc\` = ?, \`page_length\` = ?, \`status\` = ?
     WHERE id = ?`,
    [
      payload.lang_id,
      payload.cate_id,
      payload.type_id,
      payload.name,
      payload.desc,
      payload.page_length,
      payload.status,
      id,
    ],
  );
}

export async function deleteSurvey(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute(`DELETE FROM ${TABLE_NAME} WHERE id = ?`, [id]);
}
