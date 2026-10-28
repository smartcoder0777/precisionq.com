/**
 * Insurances CRUD and clinic_insurances links for an insurance row.
 */
import { getAuthSession } from "@/lib/auth-session";
import { normalizeUsPhone } from "@/lib/phone-format";
import * as ClinicInsuranceModel from "@/models/clinic-insurance.model";
import * as ClinicModel from "@/models/clinic.model";
import * as InsuranceModel from "@/models/insurance.model";
import type { HttpResult } from "./health.controller";
import { requireRolePermission } from "./_permission";

async function unauthorized(): Promise<HttpResult<{ ok: false; message: string }>> {
  return { status: 401, body: { ok: false, message: "Unauthorized." } };
}

function strOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function numOrNull(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** 1 = active, 0 = inactive (matches typical tinyint convention). */
function parseStatus(v: unknown): number {
  if (v === 1 || v === "1" || v === true) return 1;
  if (v === 0 || v === "0" || v === false) return 0;
  if (typeof v === "string" && v.toLowerCase() === "active") return 1;
  if (typeof v === "string" && v.toLowerCase() === "inactive") return 0;
  const n = Number(v);
  if (n === 1) return 1;
  return 0;
}

export const insuranceController = {
  async create(
    input: Record<string, unknown>,
  ): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "insurance", "create");
    if (denied) return denied;

    const name = strOrNull(input.name);
    if (!name) {
      return { status: 400, body: { ok: false, message: "Name is required." } };
    }

    const payload: InsuranceModel.CreateInsuranceInput = {
      name,
      email: strOrNull(input.email),
      phone: normalizeUsPhone(input.phone),
      fax: normalizeUsPhone(input.fax),
      address: strOrNull(input.address),
      city: strOrNull(input.city),
      state: strOrNull(input.state),
      zip: strOrNull(input.zip),
      status: parseStatus(input.status ?? 1),
      img: typeof input.img === "string" ? input.img : "",
    };

    try {
      const id = await InsuranceModel.createInsurance(payload);
      return { status: 201, body: { ok: true, id } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Create failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async update(
    id: number,
    input: Record<string, unknown>,
  ): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "insurance", "edit");
    if (denied) return denied;

    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid insurance id." } };
    }

    const patch: InsuranceModel.InsuranceUpdatePatch = {};
    if (input.name !== undefined) {
      const name = strOrNull(input.name);
      if (!name) {
        return { status: 400, body: { ok: false, message: "Name cannot be empty." } };
      }
      patch.name = name;
    }
    if (input.email !== undefined) patch.email = strOrNull(input.email);
    if (input.phone !== undefined) patch.phone = normalizeUsPhone(input.phone);
    if (input.fax !== undefined) patch.fax = normalizeUsPhone(input.fax);
    if (input.address !== undefined) patch.address = strOrNull(input.address);
    if (input.city !== undefined) patch.city = strOrNull(input.city);
    if (input.state !== undefined) patch.state = strOrNull(input.state);
    if (input.zip !== undefined) patch.zip = strOrNull(input.zip);
    if (input.status !== undefined) patch.status = parseStatus(input.status);
    if (input.img !== undefined) patch.img = typeof input.img === "string" ? input.img : "";

    try {
      const existing = await InsuranceModel.getInsuranceById(id);
      if (!existing) {
        return { status: 404, body: { ok: false, message: "Insurance not found." } };
      }
      await InsuranceModel.updateInsuranceById(id, patch);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Update failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async remove(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "insurance", "delete");
    if (denied) return denied;

    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid insurance id." } };
    }

    try {
      const existing = await InsuranceModel.getInsuranceById(id);
      if (!existing) {
        return { status: 404, body: { ok: false, message: "Insurance not found." } };
      }
      await ClinicInsuranceModel.deleteClinicInsurancesByInsurancePk(id);
      await InsuranceModel.deleteInsuranceById(id);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async replaceClinics(
    insuranceId: number,
    clinicIdsRaw: unknown,
  ): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "insurance", "edit");
    if (denied) return denied;

    if (!Number.isFinite(insuranceId) || insuranceId <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid insurance id." } };
    }

    if (!Array.isArray(clinicIdsRaw)) {
      return { status: 400, body: { ok: false, message: "clinicIds must be an array." } };
    }

    const requested: number[] = [];
    for (const item of clinicIdsRaw) {
      const n = Number(item);
      if (Number.isFinite(n) && n > 0) requested.push(n);
    }

    try {
      const existing = await InsuranceModel.getInsuranceById(insuranceId);
      if (!existing) {
        return { status: 404, body: { ok: false, message: "Insurance not found." } };
      }

      const clinics = await ClinicModel.getAllClinics();
      const validIds = new Set(clinics.map(c => c.id));
      const clinicIds = requested.filter(cid => validIds.has(cid));

      await ClinicInsuranceModel.replaceClinicInsurancesForInsurancePk(insuranceId, clinicIds);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Save failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },
};
