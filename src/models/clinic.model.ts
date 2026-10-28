import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { CLINICS_COLUMNS } from "@/db/schema/clinics-agreements";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "./_crud";

const TABLE_NAME = "clinics";
const COLUMNS = CLINICS_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((column) => column !== "id");

export type ClinicRecord = RowDataPacket & {
  id: number;
  clinic_id: number | null;
  name: string | null;
  acronym: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  web: string | null;
  portal: string | null;
};

export type CreateClinicInput = Omit<ClinicRecord, "id">;

export const getAllClinics = () => selectAll<ClinicRecord>(TABLE_NAME, COLUMNS);
export const getClinicById = (id: number) => selectById<ClinicRecord>(TABLE_NAME, COLUMNS, id);
export const createClinic = (payload: CreateClinicInput) => insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);

export type ClinicUpdatePatch = Partial<{
  clinic_id: number | null;
  name: string | null;
  acronym: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  web: string | null;
  portal: string | null;
}>;

export async function updateClinicById(id: number, patch: ClinicUpdatePatch): Promise<void> {
  const pool = getPool();
  const allowed = [
    "clinic_id",
    "name",
    "acronym",
    "address1",
    "address2",
    "city",
    "state",
    "zip",
    "phone",
    "email",
    "web",
    "portal",
  ] as const satisfies readonly (keyof ClinicUpdatePatch)[];
  const entries = allowed.filter((k) => patch[k] !== undefined).map((k) => [k, patch[k]!] as const);
  if (entries.length === 0) return;
  const setClause = entries.map(([k]) => `\`${k}\` = ?`).join(", ");
  const vals = entries.map(([, v]) => v);
  await pool.execute<ResultSetHeader>(
    `UPDATE ${TABLE_NAME} SET ${setClause} WHERE id = ? LIMIT 1`,
    [...vals, id] as unknown as (string | number | null)[],
  );
}

export async function deleteClinicById(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE id = ? LIMIT 1`, [id]);
}
