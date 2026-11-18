import "server-only";

import type { RowDataPacket } from "mysql2";
import * as ClinicModel from "@/models/clinic.model";
import { getConectorPool, isConectorDbConfigured } from "@/lib/conector-db";

type ConectorClinicRow = RowDataPacket & {
  id: number;
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
  status: number | string | null;
};

export type SyncConectorClinicsResult = {
  ok: boolean;
  configured: boolean;
  inserted: number;
  updated: number;
  totalRemote: number;
  message?: string;
};

function strOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/**
 * Mirror active clinics from Azul / Conector (`clinics` in `pqnyrosja_ch`)
 * into the PrecisionQ admin `clinics` table (matched on `clinic_id`).
 * Inserts missing rows and refreshes name/contact fields on existing matches.
 */
export async function syncConectorClinicsIntoAdmin(): Promise<SyncConectorClinicsResult> {
  if (!isConectorDbConfigured()) {
    return {
      ok: false,
      configured: false,
      inserted: 0,
      updated: 0,
      totalRemote: 0,
      message: "Conector DB is not configured (CONECTOR_DB_*).",
    };
  }

  const pool = getConectorPool();
  if (!pool) {
    return {
      ok: false,
      configured: true,
      inserted: 0,
      updated: 0,
      totalRemote: 0,
      message: "Conector DB pool could not be created.",
    };
  }

  let conectorRows: ConectorClinicRow[];
  try {
    const [rows] = await pool.execute<ConectorClinicRow[]>(
      `SELECT id, name, acronym, address1, address2, city, state, zip, phone, email, web, portal, status
       FROM clinics
       WHERE status = 1 OR status = '1'
       ORDER BY name ASC`,
    );
    conectorRows = rows;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Conector clinic query failed.";
    console.error("[syncConectorClinicsIntoAdmin]", message);
    return {
      ok: false,
      configured: true,
      inserted: 0,
      updated: 0,
      totalRemote: 0,
      message,
    };
  }

  if (conectorRows.length === 0) {
    return {
      ok: true,
      configured: true,
      inserted: 0,
      updated: 0,
      totalRemote: 0,
      message: "No active clinics returned from Conector.",
    };
  }

  const adminRows = await ClinicModel.getAllClinics();
  const byConectorId = new Map<number, ClinicModel.ClinicRecord>();
  for (const row of adminRows) {
    if (row.clinic_id != null) byConectorId.set(row.clinic_id, row);
  }

  let inserted = 0;
  let updated = 0;

  for (const ch of conectorRows) {
    const conectorId = Number(ch.id);
    if (!Number.isFinite(conectorId) || conectorId <= 0) continue;

    const name = (ch.name ?? "").trim() || `Clinic #${conectorId}`;
    const patch = {
      clinic_id: conectorId,
      name,
      acronym: strOrNull(ch.acronym),
      address1: strOrNull(ch.address1),
      address2: strOrNull(ch.address2),
      city: strOrNull(ch.city),
      state: strOrNull(ch.state),
      zip: strOrNull(ch.zip),
      phone: strOrNull(ch.phone),
      email: strOrNull(ch.email),
      web: strOrNull(ch.web),
      portal: strOrNull(ch.portal),
    };

    const existing = byConectorId.get(conectorId);
    if (existing) {
      const nameChanged = (existing.name ?? "").trim() !== name;
      const needsRefresh =
        nameChanged ||
        existing.acronym !== patch.acronym ||
        existing.address1 !== patch.address1 ||
        existing.city !== patch.city ||
        existing.phone !== patch.phone ||
        existing.email !== patch.email;
      if (needsRefresh) {
        await ClinicModel.updateClinicById(existing.id, patch);
        updated += 1;
      }
      continue;
    }

    const id = await ClinicModel.createClinic(patch);
    byConectorId.set(conectorId, { id, ...patch } as ClinicModel.ClinicRecord);
    inserted += 1;
  }

  return {
    ok: true,
    configured: true,
    inserted,
    updated,
    totalRemote: conectorRows.length,
  };
}
