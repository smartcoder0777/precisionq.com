import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { PATIENT_SERVICES_COLUMNS } from "@/db/schema/patient-services";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "./_crud";

const TABLE_NAME = "patient_services";
const COLUMNS = PATIENT_SERVICES_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((column) => column !== "id");

export type PatientServiceRecord = RowDataPacket & {
  id: number; category_id: number | null; ar_name: string | null; da_name: string | null; de_name: string | null; en_name: string | null; es_name: string | null; fr_name: string | null; it_name: string | null; ja_name: string | null; ko_name: string | null; nl_name: string | null; pt_name: string | null; ru_name: string | null; tr_name: string | null; zh_name: string | null; image: string | null;
  ar_desc: string | null; da_desc: string | null; de_desc: string | null; en_desc: string | null; es_desc: string | null; fr_desc: string | null; it_desc: string | null; ja_desc: string | null; ko_desc: string | null; nl_desc: string | null; pt_desc: string | null; ru_desc: string | null; tr_desc: string | null; zh_desc: string | null; ar_detail: string | null; da_detail: string | null; de_detail: string | null; en_detail: string | null; es_detail: string | null; fr_detail: string | null; it_detail: string | null; ja_detail: string | null; ko_detail: string | null; nl_detail: string | null; pt_detail: string | null; ru_detail: string | null; tr_detail: string | null; zh_detail: string | null; contact: string | null;
  status: number | null;
};

export type CreatePatientServiceInput = Omit<PatientServiceRecord, "id">;
export const getAllPatientServices = () => selectAll<PatientServiceRecord>(TABLE_NAME, COLUMNS);
export const getPatientServiceById = (id: number) => selectById<PatientServiceRecord>(TABLE_NAME, COLUMNS, id);
export const createPatientService = (payload: CreatePatientServiceInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);

export async function getPatientServicesByCategoryId(categoryId: number): Promise<PatientServiceRecord[]> {
  const pool = getPool();
  const [rows] = await pool.execute<PatientServiceRecord[]>(
    `SELECT ${COLUMNS.join(", ")} FROM ${TABLE_NAME} WHERE category_id = ? ORDER BY id ASC`,
    [categoryId],
  );
  return rows;
}

export type PatientServiceUpdatePatch = Partial<CreatePatientServiceInput>;

export async function updatePatientServiceById(id: number, patch: PatientServiceUpdatePatch): Promise<void> {
  const pool = getPool();
  const entries: [string, string | number | null][] = [];
  for (const k of INSERT_COLUMNS) {
    const key = k as keyof PatientServiceUpdatePatch;
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

export async function deletePatientServiceById(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE id = ? LIMIT 1`, [id]);
}

/** Deletes every row in `patient_services` for the given category (used when removing the category). */
export async function deletePatientServicesByCategoryId(categoryId: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE category_id = ?`, [categoryId]);
}
