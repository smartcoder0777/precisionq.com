import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { EDUCATION_CATEGORIES_COLUMNS } from "@/db/schema/education-products";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "../_crud";

const TABLE_NAME = "education_categories";
const COLUMNS = EDUCATION_CATEGORIES_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id");

export type EducationCategoryRecord = RowDataPacket & {
  id: number;
  parent_menu: string | null;
  text_ar: string | null;
  text_da: string | null;
  text_de: string | null;
  text_en: string | null;
  text_es: string | null;
  text_fr: string | null;
  text_it: string | null;
  text_ja: string | null;
  text_ko: string | null;
  text_nl: string | null;
  text_pt: string | null;
  text_ru: string | null;
  text_tr: string | null;
  text_zh: string | null;
  status: number | null;
};
export type CreateEducationCategoryInput = Omit<EducationCategoryRecord, "id">;
export const getAllEducationCategories = () => selectAll<EducationCategoryRecord>(TABLE_NAME, COLUMNS);
export const getEducationCategoryById = (id: number) =>
  selectById<EducationCategoryRecord>(TABLE_NAME, COLUMNS, id);
export const createEducationCategory = (payload: CreateEducationCategoryInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);

export type EducationCategoryUpdatePatch = Partial<CreateEducationCategoryInput>;

export async function updateEducationCategoryById(id: number, patch: EducationCategoryUpdatePatch): Promise<void> {
  const pool = getPool();
  const entries: [string, string | number | null][] = [];
  for (const k of INSERT_COLUMNS) {
    const key = k as keyof EducationCategoryUpdatePatch;
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

export async function deleteEducationCategoryById(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE id = ? LIMIT 1`, [id]);
}
