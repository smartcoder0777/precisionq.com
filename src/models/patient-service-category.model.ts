import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { PATIENT_SERVICE_CATS_COLUMNS } from "@/db/schema/patient-services";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "./_crud";

const TABLE_NAME = "patient_service_cats";
const COLUMNS = PATIENT_SERVICE_CATS_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((column) => column !== "id");

export type PatientServiceCategoryRecord = RowDataPacket & {
  id: number;
  ar_name: string | null;
  da_name: string | null;
  de_name: string | null;
  en_name: string | null;
  es_name: string | null;
  fr_name: string | null;
  it_name: string | null;
  ja_name: string | null;
  ko_name: string | null;
  nl_name: string | null;
  pt_name: string | null;
  ru_name: string | null;
  tr_name: string | null;
  zh_name: string | null;
  status: number | null;
};

export type CreatePatientServiceCategoryInput = Omit<PatientServiceCategoryRecord, "id">;
export const getAllPatientServiceCategories = () =>
  selectAll<PatientServiceCategoryRecord>(TABLE_NAME, COLUMNS);
export const getPatientServiceCategoryById = (id: number) =>
  selectById<PatientServiceCategoryRecord>(TABLE_NAME, COLUMNS, id);
export const createPatientServiceCategory = (payload: CreatePatientServiceCategoryInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);

export type PatientServiceCategoryUpdatePatch = Partial<CreatePatientServiceCategoryInput>;

export async function updatePatientServiceCategoryById(id: number, patch: PatientServiceCategoryUpdatePatch): Promise<void> {
  const pool = getPool();
  const entries: [string, string | number | null][] = [];
  for (const k of INSERT_COLUMNS) {
    const key = k as keyof PatientServiceCategoryUpdatePatch;
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

export async function deletePatientServiceCategoryById(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE id = ? LIMIT 1`, [id]);
}
