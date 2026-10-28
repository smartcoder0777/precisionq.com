/**
 * Admin CRUD for `patient_service_cats`.
 */
import { SUPPORTED_LANGUAGES } from "@/lib/supported-languages";
import { getAuthSession } from "@/lib/auth-session";
import { unlinkPatientServiceStoredImage } from "@/lib/server/unlink-patient-service-image";
import * as PatientServiceCategoryModel from "@/models/patient-service-category.model";
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

function toCategoryPayload(
  names: Record<string, string>,
  statusUi: unknown,
): PatientServiceCategoryModel.CreatePatientServiceCategoryInput {
  const row: Record<string, string | number | null> = { status: statusToDb(statusUi) };
  for (const { code } of SUPPORTED_LANGUAGES) {
    row[`${code}_name`] = strOrNull(names[code]);
  }
  return row as PatientServiceCategoryModel.CreatePatientServiceCategoryInput;
}

export const patientServiceCategoriesController = {
  async create(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "patient-services", "create");
    if (denied) return denied;

    const names = coerceLangMap(input.names);
    if (!names || !strOrNull(names.en)) {
      return { status: 400, body: { ok: false, message: "English name is required." } };
    }
    try {
      const payload = toCategoryPayload(names, input.status);
      const id = await PatientServiceCategoryModel.createPatientServiceCategory(payload);
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
      return { status: 400, body: { ok: false, message: "Invalid category id." } };
    }
    const names = coerceLangMap(input.names);
    if (!names || !strOrNull(names.en)) {
      return { status: 400, body: { ok: false, message: "English name is required." } };
    }
    try {
      const existing = await PatientServiceCategoryModel.getPatientServiceCategoryById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Category not found." } };
      const payload = toCategoryPayload(names, input.status);
      await PatientServiceCategoryModel.updatePatientServiceCategoryById(id, payload);
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
      return { status: 400, body: { ok: false, message: "Invalid category id." } };
    }
    try {
      const existing = await PatientServiceCategoryModel.getPatientServiceCategoryById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Category not found." } };

      const services = await PatientServiceModel.getPatientServicesByCategoryId(id);
      for (const row of services) {
        try {
          await unlinkPatientServiceStoredImage(row.image);
        } catch (unlinkErr) {
          console.error("[patient-service-cats] Failed to remove service image:", unlinkErr);
        }
      }
      await PatientServiceModel.deletePatientServicesByCategoryId(id);
      await PatientServiceCategoryModel.deletePatientServiceCategoryById(id);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },
};
