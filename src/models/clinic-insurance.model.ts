/**
 * Junction: `clinics.id` ↔ `insurances.id`. Example DDL:
 *
 * CREATE TABLE clinic_insurances (
 *   id INT AUTO_INCREMENT PRIMARY KEY,
 *   clinic_id INT NOT NULL,
 *   insurance_id INT NOT NULL,
 *   pt_portal_repid INT NULL,
 *   pcp_portal_repid INT NULL,
 *   pt_eligib_repid INT NULL,
 *   hedis_repid INT NULL,
 *   coverage_repid INT NULL,
 *   FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
 *   FOREIGN KEY (insurance_id) REFERENCES insurances(id) ON DELETE CASCADE
 * );
 */
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { CLINIC_INSURANCES_COLUMNS } from "@/db/schema/clinics-agreements";
import { getPool } from "@/lib/db";
import { insertRecord, selectAll, selectById } from "./_crud";

const TABLE_NAME = "clinic_insurances";
const COLUMNS = CLINIC_INSURANCES_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((column) => column !== "id");

export type ClinicInsuranceRecord = RowDataPacket & {
  id: number;
  clinic_id: number | null;
  insurance_id: number | null;
  pt_portal_repid: number | null;
  pcp_portal_repid: number | null;
  pt_eligib_repid: number | null;
  hedis_repid: number | null;
  coverage_repid: number | null;
};

export type CreateClinicInsuranceInput = Omit<ClinicInsuranceRecord, "id">;

export const getAllClinicInsurances = () => selectAll<ClinicInsuranceRecord>(TABLE_NAME, COLUMNS);
export const getClinicInsuranceById = (id: number) => selectById<ClinicInsuranceRecord>(TABLE_NAME, COLUMNS, id);
export const createClinicInsurance = (payload: CreateClinicInsuranceInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);

/** `clinic_id` references `clinics.id`. */
export async function deleteClinicInsurancesByClinicPk(clinicPk: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE clinic_id = ?`, [clinicPk]);
}

type ClinicInsuranceLinkRow = RowDataPacket & { clinic_id: number | null; insurance_id: number | null };

export async function getInsuranceIdsByClinicPks(clinicPks: number[]): Promise<Map<number, number[]>> {
  const map = new Map<number, number[]>();
  if (clinicPks.length === 0) return map;
  const pool = getPool();
  const ph = clinicPks.map(() => "?").join(", ");
  const [rows] = await pool.execute<ClinicInsuranceLinkRow[]>(
    `SELECT clinic_id, insurance_id FROM ${TABLE_NAME} WHERE clinic_id IN (${ph})`,
    clinicPks,
  );
  for (const row of rows) {
    const cid = row.clinic_id;
    const iid = row.insurance_id;
    if (cid == null || iid == null) continue;
    const arr = map.get(cid) ?? [];
    arr.push(iid);
    map.set(cid, arr);
  }
  return map;
}

/** `insurance_id` references `insurances.id`. */
export async function deleteClinicInsurancesByInsurancePk(insurancePk: number): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(`DELETE FROM ${TABLE_NAME} WHERE insurance_id = ?`, [insurancePk]);
}

export async function getClinicIdsByInsurancePks(insurancePks: number[]): Promise<Map<number, number[]>> {
  const map = new Map<number, number[]>();
  if (insurancePks.length === 0) return map;
  const pool = getPool();
  const ph = insurancePks.map(() => "?").join(", ");
  const [rows] = await pool.execute<ClinicInsuranceLinkRow[]>(
    `SELECT clinic_id, insurance_id FROM ${TABLE_NAME} WHERE insurance_id IN (${ph})`,
    insurancePks,
  );
  for (const row of rows) {
    const cid = row.clinic_id;
    const iid = row.insurance_id;
    if (cid == null || iid == null) continue;
    const arr = map.get(iid) ?? [];
    arr.push(cid);
    map.set(iid, arr);
  }
  return map;
}

export async function replaceClinicInsurancesForInsurancePk(insurancePk: number, clinicIds: number[]): Promise<void> {
  await deleteClinicInsurancesByInsurancePk(insurancePk);
  for (const clinicId of clinicIds) {
    await insertRecord(TABLE_NAME, INSERT_COLUMNS, {
      ...emptyLinkPayload(),
      clinic_id: clinicId,
      insurance_id: insurancePk,
    });
  }
}

const emptyLinkPayload = (): CreateClinicInsuranceInput => ({
  clinic_id: null,
  insurance_id: null,
  pt_portal_repid: null,
  pcp_portal_repid: null,
  pt_eligib_repid: null,
  hedis_repid: null,
  coverage_repid: null,
});

export async function replaceClinicInsurancesForClinicPk(clinicPk: number, insuranceIds: number[]): Promise<void> {
  await deleteClinicInsurancesByClinicPk(clinicPk);
  for (const insuranceId of insuranceIds) {
    await insertRecord(TABLE_NAME, INSERT_COLUMNS, {
      ...emptyLinkPayload(),
      clinic_id: clinicPk,
      insurance_id: insuranceId,
    });
  }
}
