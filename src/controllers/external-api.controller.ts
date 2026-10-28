import { getPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import * as ContactTrackModel from "@/models/contact-track.model";
import * as AgreementModel from "@/models/agreement.model";
import type { HttpResult } from "./health.controller";
import { normalizeUsPhone } from "@/lib/phone-format";

type ClinicPkRow = RowDataPacket & { id: number };

function strOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function numOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseCaseUpdatePatch(input: Record<string, unknown>): ContactTrackModel.ContactTrackPatch {
  const patch: ContactTrackModel.ContactTrackPatch = {};
  if (input.assign !== undefined) patch.assign = strOrNull(input.assign);
  if (input.status !== undefined) patch.status = numOrNull(input.status);
  if (input.priority !== undefined) patch.priority = numOrNull(input.priority);
  return patch;
}

function pickAgreementByType(rows: AgreementModel.AgreementRecord[], type: "Privacy Policy" | "Terms of Use") {
  const t = type.toLowerCase();
  const matchType = (r: AgreementModel.AgreementRecord) => String(r.type ?? "").toLowerCase() === t;
  const active = rows.filter((r) => (r.status ?? 1) === 1 && matchType(r));
  return active[0] ?? rows.find((r) => matchType(r)) ?? null;
}

function agreementPayload(row: AgreementModel.AgreementRecord | null, lang = "en") {
  if (!row) return null;
  const l = String(lang || "en").toLowerCase();
  const descKey = `${l}_desc` as keyof AgreementModel.AgreementRecord;
  const nameKey = `${l}_name` as keyof AgreementModel.AgreementRecord;
  const fallbackDesc = row.en_desc ?? "";
  const fallbackName = row.en_name ?? "";
  const description = String((row[descKey] as string | null) ?? fallbackDesc ?? "");
  const name = String((row[nameKey] as string | null) ?? fallbackName ?? "");
  return { id: row.id, type: row.type, lang: l, name, description };
}

export const externalApiController = {
  async createAPI(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
    const name = strOrNull(input.name);
    const email = strOrNull(input.email);
    const message = strOrNull(input.message);
    if (!name || !email || !message) {
      return { status: 400, body: { ok: false, message: "name, email and message are required." } };
    }
    const id = await ContactTrackModel.createContactTrack({
      case_number: numOrNull(input.case_number),
      clinic: strOrNull(input.clinic),
      type: numOrNull(input.type),
      reason: strOrNull(input.reason),
      name,
      dob: strOrNull(input.dob),
      email,
      cel: normalizeUsPhone(input.cel),
      subject: strOrNull(input.subject) ?? "External Contact",
      message,
      date: strOrNull(input.date) ?? new Date(),
      assign: strOrNull(input.assign),
      status: numOrNull(input.status) ?? 1,
      priority: numOrNull(input.priority) ?? 2,
      lang: strOrNull(input.lang) ?? "en",
      besttime: strOrNull(input.besttime),
    });
    return { status: 201, body: { ok: true, id } };
  },

  async readAPI(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; rows?: unknown[]; message?: string }>> {
    const clinic = strOrNull(input.clinic);
    const limit = Math.max(1, Math.min(1000, numOrNull(input.limit) ?? 200));
    const rows = await ContactTrackModel.getContactTracksOrdered(limit);
    const filtered = clinic ? rows.filter((r) => String(r.clinic ?? "") === clinic) : rows;
    return { status: 200, body: { ok: true, rows: filtered } };
  },

  async readOneAPI(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; row?: unknown; message?: string }>> {
    const id = numOrNull(input.id);
    if (!id || id <= 0) return { status: 400, body: { ok: false, message: "id is required." } };
    const row = await ContactTrackModel.getContactTrackById(id);
    if (!row) return { status: 404, body: { ok: false, message: "Contact track not found." } };
    return { status: 200, body: { ok: true, row } };
  },

  async updateAPI(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const id = numOrNull(input.id);
    if (!id || id <= 0) return { status: 400, body: { ok: false, message: "id is required." } };
    const row = await ContactTrackModel.getContactTrackById(id);
    if (!row) return { status: 404, body: { ok: false, message: "Contact track not found." } };
    const patch = parseCaseUpdatePatch(input);
    await ContactTrackModel.updateContactTrackById(id, patch);
    return { status: 200, body: { ok: true } };
  },

  async updateByCaseNumber(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const caseNumber = numOrNull(input.case_number);
    if (!caseNumber || caseNumber <= 0) return { status: 400, body: { ok: false, message: "case_number is required." } };
    const row = await ContactTrackModel.getContactTrackByCaseNumber(caseNumber);
    if (!row) return { status: 404, body: { ok: false, message: "Contact track not found." } };
    const patch = parseCaseUpdatePatch(input);
    await ContactTrackModel.updateContactTrackByCaseNumber(caseNumber, patch);
    return { status: 200, body: { ok: true } };
  },

  async deleteAPI(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const id = numOrNull(input.id);
    if (!id || id <= 0) return { status: 400, body: { ok: false, message: "id is required." } };
    await ContactTrackModel.deleteContactTrackById(id);
    return { status: 200, body: { ok: true } };
  },

  async deleteByCaseNumber(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const caseNumber = numOrNull(input.case_number);
    if (!caseNumber || caseNumber <= 0) return { status: 400, body: { ok: false, message: "case_number is required." } };
    await ContactTrackModel.deleteContactTrackByCaseNumber(caseNumber);
    return { status: 200, body: { ok: true } };
  },

  async readInsuranceByClinicAPI(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; rows?: unknown[]; message?: string }>> {
    const clinicExternalId = numOrNull(input.clinic_id);
    if (!clinicExternalId || clinicExternalId <= 0) return { status: 400, body: { ok: false, message: "clinic_id is required." } };
    const pool = getPool();
    const [clinicRows] = await pool.execute<ClinicPkRow[]>(
      `SELECT id FROM clinics WHERE clinic_id = ? LIMIT 1`,
      [clinicExternalId],
    );
    const clinicPk = clinicRows[0]?.id;
    if (!clinicPk) return { status: 200, body: { ok: true, rows: [] } };
    const [rows] = await pool.execute(
      `SELECT i.*
       FROM clinic_insurances ci
       INNER JOIN insurances i ON i.id = ci.insurance_id
       WHERE ci.clinic_id = ?
       ORDER BY i.name ASC`,
      [clinicPk],
    );
    return { status: 200, body: { ok: true, rows: rows as unknown[] } };
  },

  async getTermsOfUse(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; row?: unknown; message?: string }>> {
    const clinicExternalId = numOrNull(input.clinic_id);
    if (!clinicExternalId || clinicExternalId <= 0) return { status: 400, body: { ok: false, message: "clinic_id is required." } };
    const pool = getPool();
    const [clinicRows] = await pool.execute<ClinicPkRow[]>(
      `SELECT id FROM clinics WHERE clinic_id = ? LIMIT 1`,
      [clinicExternalId],
    );
    const clinicPk = clinicRows[0]?.id;
    if (!clinicPk) return { status: 404, body: { ok: false, message: "Clinic not found." } };
    const rows = await AgreementModel.getAllAgreements();
    const clinicRowsOnly = rows.filter((r) => String(r.clinic_id ?? "").split(",").includes(String(clinicPk)));
    const row = pickAgreementByType(clinicRowsOnly, "Terms of Use");
    const data = agreementPayload(row, strOrNull(input.lang) ?? "en");
    if (!data) return { status: 404, body: { ok: false, message: "Terms of Use not found." } };
    return { status: 200, body: { ok: true, row: data } };
  },

  async getPrivacyPolicy(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; row?: unknown; message?: string }>> {
    const clinicExternalId = numOrNull(input.clinic_id);
    if (!clinicExternalId || clinicExternalId <= 0) return { status: 400, body: { ok: false, message: "clinic_id is required." } };
    const pool = getPool();
    const [clinicRows] = await pool.execute<ClinicPkRow[]>(
      `SELECT id FROM clinics WHERE clinic_id = ? LIMIT 1`,
      [clinicExternalId],
    );
    const clinicPk = clinicRows[0]?.id;
    if (!clinicPk) return { status: 404, body: { ok: false, message: "Clinic not found." } };
    const rows = await AgreementModel.getAllAgreements();
    const clinicRowsOnly = rows.filter((r) => String(r.clinic_id ?? "").split(",").includes(String(clinicPk)));
    const row = pickAgreementByType(clinicRowsOnly, "Privacy Policy");
    const data = agreementPayload(row, strOrNull(input.lang) ?? "en");
    if (!data) return { status: 404, body: { ok: false, message: "Privacy Policy not found." } };
    return { status: 200, body: { ok: true, row: data } };
  },
};
