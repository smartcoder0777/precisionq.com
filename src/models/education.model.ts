import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { EDUCATIONS_COLUMNS } from "@/db/schema/education-products";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "./_crud";

const TABLE_NAME = "educations";

const COLUMNS = EDUCATIONS_COLUMNS as unknown as readonly string[];

const INSERT_COLUMNS = COLUMNS.filter((column) => column !== "id");

export type EducationRecord = RowDataPacket & {
  id: number;
  page: string | null;
  title_en: string | null;
  title_es: string | null;
  desc_en: string | null;
  desc_es: string | null;
  file_en: string | null;
  file_es: string | null;
  title_ar: string | null;
  title_da: string | null;
  title_de: string | null;
  title_fr: string | null;
  title_it: string | null;
  title_ja: string | null;
  title_ko: string | null;
  title_nl: string | null;
  title_pt: string | null;
  title_ru: string | null;
  title_tr: string | null;
  title_zh: string | null;
  desc_ar: string | null;
  desc_da: string | null;
  desc_de: string | null;
  desc_fr: string | null;
  desc_it: string | null;
  desc_ja: string | null;
  desc_ko: string | null;
  desc_nl: string | null;
  desc_pt: string | null;
  desc_ru: string | null;
  desc_tr: string | null;
  desc_zh: string | null;
  file_ar: string | null;
  file_da: string | null;
  file_de: string | null;
  file_fr: string | null;
  file_it: string | null;
  file_ja: string | null;
  file_ko: string | null;
  file_nl: string | null;
  file_pt: string | null;
  file_ru: string | null;
  file_tr: string | null;
  file_zh: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type CreateEducationInput = Omit<EducationRecord, "id">;
export type EducationUpdatePatch = Partial<CreateEducationInput>;

export const getAllEducations = () => selectAll<EducationRecord>(TABLE_NAME, COLUMNS);
export const getEducationById = (id: number) => selectById<EducationRecord>(TABLE_NAME, COLUMNS, id);
export const createEducation = (payload: CreateEducationInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);

export async function updateEducationById(id: number, patch: EducationUpdatePatch): Promise<void> {
  const pool = getPool();
  const entries: [string, string | number | Date | null][] = [];
  for (const k of INSERT_COLUMNS) {
    const key = k as keyof EducationUpdatePatch;
    if (patch[key] !== undefined) entries.push([k, patch[key]!]);
  }
  if (entries.length === 0) return;
  const setClause = entries.map(([k]) => `\`${k}\` = ?`).join(", ");
  const vals = entries.map(([, v]) => v);
  await pool.execute<ResultSetHeader>(
    `UPDATE \`${TABLE_NAME}\` SET ${setClause} WHERE \`id\` = ? LIMIT 1`,
    [...vals, id] as unknown as (string | number | Date | null)[],
  );
}

export async function deleteEducationById(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM \`${TABLE_NAME}\` WHERE \`id\` = ? LIMIT 1`, [id]);
}
