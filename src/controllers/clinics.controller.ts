/**
 * Clinics CRUD for admin API routes.
 */
import { getAuthSession } from "@/lib/auth-session";
import { normalizeUsPhone } from "@/lib/phone-format";
import * as ClinicInsuranceModel from "@/models/clinic-insurance.model";
import * as ClinicModel from "@/models/clinic.model";
import type { HttpResult } from "./health.controller";
import { requireRolePermission } from "./_permission";

export type ClinicWriteBody = {
  clinicId?: unknown;
  name?: unknown;
  acronym?: unknown;
  address1?: unknown;
  address2?: unknown;
  city?: unknown;
  state?: unknown;
  zip?: unknown;
  phone?: unknown;
  email?: unknown;
  web?: unknown;
  portal?: unknown;
};

function numOrNull(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

async function unauthorized(): Promise<HttpResult<{ ok: false; message: string }>> {
  return { status: 401, body: { ok: false, message: "Unauthorized." } };
}

function toCreatePayload(input: ClinicWriteBody): ClinicModel.CreateClinicInput | null {
  const name = strOrNull(input.name);
  if (!name) return null;
  return {
    clinic_id: numOrNull(input.clinicId),
    name,
    acronym: strOrNull(input.acronym),
    address1: strOrNull(input.address1),
    address2: strOrNull(input.address2),
    city: strOrNull(input.city),
    state: strOrNull(input.state),
    zip: strOrNull(input.zip),
    phone: normalizeUsPhone(input.phone),
    email: strOrNull(input.email),
    web: strOrNull(input.web),
    portal: strOrNull(input.portal),
  };
}

export const clinicsController = {
  async create(input: ClinicWriteBody): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "clinics", "create");
    if (denied) return denied;

    const payload = toCreatePayload(input);
    if (!payload) {
      return { status: 400, body: { ok: false, message: "Name is required." } };
    }

    try {
      const id = await ClinicModel.createClinic(payload);
      return { status: 201, body: { ok: true, id } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Create failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async update(
    id: number,
    input: ClinicWriteBody,
  ): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "clinics", "edit");
    if (denied) return denied;

    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid clinic id." } };
    }

    const patch: ClinicModel.ClinicUpdatePatch = {};
    if (input.clinicId !== undefined) patch.clinic_id = numOrNull(input.clinicId);
    if (input.name !== undefined) {
      const name = strOrNull(input.name);
      if (!name) {
        return { status: 400, body: { ok: false, message: "Name cannot be empty." } };
      }
      patch.name = name;
    }
    if (input.acronym !== undefined) patch.acronym = strOrNull(input.acronym);
    if (input.address1 !== undefined) patch.address1 = strOrNull(input.address1);
    if (input.address2 !== undefined) patch.address2 = strOrNull(input.address2);
    if (input.city !== undefined) patch.city = strOrNull(input.city);
    if (input.state !== undefined) patch.state = strOrNull(input.state);
    if (input.zip !== undefined) patch.zip = strOrNull(input.zip);
    if (input.phone !== undefined) patch.phone = normalizeUsPhone(input.phone);
    if (input.email !== undefined) patch.email = strOrNull(input.email);
    if (input.web !== undefined) patch.web = strOrNull(input.web);
    if (input.portal !== undefined) patch.portal = strOrNull(input.portal);

    try {
      const existing = await ClinicModel.getClinicById(id);
      if (!existing) {
        return { status: 404, body: { ok: false, message: "Clinic not found." } };
      }
      await ClinicModel.updateClinicById(id, patch);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Update failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async remove(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "clinics", "delete");
    if (denied) return denied;

    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid clinic id." } };
    }

    try {
      const existing = await ClinicModel.getClinicById(id);
      if (!existing) {
        return { status: 404, body: { ok: false, message: "Clinic not found." } };
      }
      await ClinicInsuranceModel.deleteClinicInsurancesByClinicPk(id);
      await ClinicModel.deleteClinicById(id);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async replaceInsurances(
    id: number,
    insuranceIdsRaw: unknown,
  ): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "clinics", "edit");
    if (denied) return denied;

    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid clinic id." } };
    }

    if (!Array.isArray(insuranceIdsRaw)) {
      return { status: 400, body: { ok: false, message: "insuranceIds must be an array." } };
    }

    const insuranceIds: number[] = [];
    for (const item of insuranceIdsRaw) {
      const n = Number(item);
      if (Number.isFinite(n) && n > 0) insuranceIds.push(n);
    }

    try {
      const existing = await ClinicModel.getClinicById(id);
      if (!existing) {
        return { status: 404, body: { ok: false, message: "Clinic not found." } };
      }
      await ClinicInsuranceModel.replaceClinicInsurancesForClinicPk(id, insuranceIds);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Save failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },
};
