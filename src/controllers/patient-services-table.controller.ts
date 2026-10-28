/**
 * Admin CRUD for `patient_services`.
 */
import { SUPPORTED_LANGUAGES } from "@/lib/supported-languages";
import { getAuthSession } from "@/lib/auth-session";
import { unlinkPatientServiceStoredImage } from "@/lib/server/unlink-patient-service-image";
import * as PatientServiceModel from "@/models/patient-service.model";
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

function statusToDb(s: unknown): 0 | 1 {
  return s === "Active" ? 1 : 0;
}

function coerceLangMap(v: unknown): Record<string, string> | null {
  if (!v || typeof v !== "object") return null;
  const src = v as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const { code } of SUPPORTED_LANGUAGES) {
    const x = src[code];
    out[code] = typeof x === "string" ? x : "";
  }
  return out;
}

function toPatientServicePayload(b: Record<string, unknown>): PatientServiceModel.CreatePatientServiceInput | null {
  const names = coerceLangMap(b.names);
  const descriptions = coerceLangMap(b.descriptions);
  const details = coerceLangMap(b.details);
  if (!names || !descriptions || !details) return null;
  if (!strOrNull(names.en)) return null;

  const categoryIdRaw = b.categoryId;
  const categoryId =
    typeof categoryIdRaw === "number" && Number.isFinite(categoryIdRaw)
      ? categoryIdRaw
      : Number(typeof categoryIdRaw === "string" ? categoryIdRaw : NaN);
  if (!Number.isFinite(categoryId) || categoryId <= 0) return null;

  const row: Record<string, string | number | null> = {
    category_id: categoryId,
    image: strOrNull(b.image),
    contact: strOrNull(b.contact),
    status: statusToDb(b.status),
  };
  for (const { code } of SUPPORTED_LANGUAGES) {
    row[`${code}_name`] = strOrNull(names[code]);
    row[`${code}_desc`] = strOrNull(descriptions[code]);
    row[`${code}_detail`] = strOrNull(details[code]);
  }
  return row as PatientServiceModel.CreatePatientServiceInput;
}

export const patientServicesTableController = {
  async create(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "patient-services", "create");
    if (denied) return denied;
    const payload = toPatientServicePayload(input);
    if (!payload) {
      return {
        status: 400,
        body: { ok: false, message: "English name and valid category are required." },
      };
    }
    try {
      const id = await PatientServiceModel.createPatientService(payload);
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
    const denied = await requireRolePermission(session, "patient-services", "edit");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid service id." } };
    }
    const payload = toPatientServicePayload(input);
    if (!payload) {
      return {
        status: 400,
        body: { ok: false, message: "English name and valid category are required." },
      };
    }
    try {
      const existing = await PatientServiceModel.getPatientServiceById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Service not found." } };
      if ((existing.category_id ?? 0) !== payload.category_id) {
        return { status: 400, body: { ok: false, message: "Category does not match this service." } };
      }
      const previousImage = existing.image;
      const nextImage = payload.image;
      await PatientServiceModel.updatePatientServiceById(id, payload);
      if (previousImage != null && previousImage !== nextImage) {
        try {
          await unlinkPatientServiceStoredImage(previousImage);
        } catch (unlinkErr) {
          console.error("[patient-services] Failed to remove previous image file:", unlinkErr);
        }
      }
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Update failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async remove(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "patient-services", "delete");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid service id." } };
    }
    try {
      const existing = await PatientServiceModel.getPatientServiceById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Service not found." } };
      const imageToRemove = existing.image;
      await PatientServiceModel.deletePatientServiceById(id);
      try {
        await unlinkPatientServiceStoredImage(imageToRemove);
      } catch (unlinkErr) {
        console.error("[patient-services] Failed to remove image file after delete:", unlinkErr);
      }
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },
};
