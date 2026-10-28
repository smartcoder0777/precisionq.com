import "server-only";

import type { RowDataPacket } from "mysql2";
import * as ClinicModel from "@/models/clinic.model";
import { getConectorPool, isConectorDbConfigured } from "@/lib/conector-db";

type ConectorClinicRow = RowDataPacket & {
  id: number;
  name: string | null;
  status: number | string | null;
};

/**
 * Mirror active clinics from Azul / Conector (`clinics` in `pqnyrosja_ch`)
 * into the PrecisionQ admin `clinics` table (matched on `clinic_id`).
 */
export async function syncConectorClinicsIntoAdmin(): Promise<void> {
  if (!isConectorDbConfigured()) return;

  const pool = getConectorPool();
  if (!pool) return;

  let conectorRows: ConectorClinicRow[];
  try {
    const [rows] = await pool.execute<ConectorClinicRow[]>(
      "SELECT id, name, status FROM clinics WHERE status = 1 OR status = '1' ORDER BY name ASC",
    );
    conectorRows = rows;
  } catch {
    return;
  }

  if (conectorRows.length === 0) return;

  const adminRows = await ClinicModel.getAllClinics();
  const byConectorId = new Map<number, ClinicModel.ClinicRecord>();
  for (const row of adminRows) {
    if (row.clinic_id != null) byConectorId.set(row.clinic_id, row);
  }

  for (const ch of conectorRows) {
    const conectorId = Number(ch.id);
    if (!Number.isFinite(conectorId) || conectorId <= 0) continue;
    if (byConectorId.has(conectorId)) continue;

    const name = (ch.name ?? "").trim() || `Clinic #${conectorId}`;
    await ClinicModel.createClinic({
      clinic_id: conectorId,
      name,
      acronym: null,
      address1: null,
      address2: null,
      city: null,
      state: null,
      zip: null,
      phone: null,
      email: null,
      web: null,
      portal: null,
    });
    byConectorId.set(conectorId, {} as ClinicModel.ClinicRecord);
  }
}
