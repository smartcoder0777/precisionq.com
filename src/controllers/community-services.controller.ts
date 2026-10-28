/**
 * Admin CRUD for `community_service_cats` and `community_services`.
 */
import { SUPPORTED_LANGUAGES } from "@/lib/supported-languages";
import { getAuthSession } from "@/lib/auth-session";
import { normalizeUsPhone } from "@/lib/phone-format";
import * as CommunityServiceCategoryModel from "@/models/community-service-category.model";
import * as CommunityServiceModel from "@/models/community-service.model";
import { unlinkCommunityServiceStoredImage } from "@/lib/server/unlink-community-service-image";
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

function coerceStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean);
}

function toCategoryPayload(
  names: Record<string, string>,
  statusUi: unknown,
): CommunityServiceCategoryModel.CreateCommunityServiceCategoryInput {
  const row: Record<string, string | number | null> = { status: statusToDb(statusUi) };
  for (const { code } of SUPPORTED_LANGUAGES) {
    row[`${code}_name`] = strOrNull(names[code]);
  }
  return row as CommunityServiceCategoryModel.CreateCommunityServiceCategoryInput;
}

type ServiceBody = Record<string, unknown>;

function toServicePayload(b: ServiceBody): CommunityServiceModel.CreateCommunityServiceInput | null {
  const names = coerceLangMap(b.names);
  const descriptions = coerceLangMap(b.descriptions);
  const details = coerceLangMap(b.details);
  if (!names || !descriptions || !details) return null;
  if (!strOrNull(names.en)) return null;
  const categoryIds = coerceStringArray(b.categoryIds);
  if (categoryIds.length === 0) return null;
  const clinicIds = coerceStringArray(b.clinicIds);

  const row: Record<string, string | number | null> = {
    category: categoryIds.join(","),
    image: strOrNull(b.image),
    address_1: strOrNull(b.address1),
    address_2: strOrNull(b.address2),
    city: strOrNull(b.city),
    state: strOrNull(b.state),
    zip: strOrNull(b.zip),
    country: strOrNull(b.country),
    phone: normalizeUsPhone(b.phone),
    email: strOrNull(b.email),
    fax: normalizeUsPhone(b.fax),
    link: strOrNull(b.link),
    additional: strOrNull(b.additional),
    clinic_allowance: clinicIds.length ? clinicIds.join(",") : null,
    status: statusToDb(b.status),
  };
  for (const { code } of SUPPORTED_LANGUAGES) {
    row[`${code}_name`] = strOrNull(names[code]);
    row[`${code}_desc`] = strOrNull(descriptions[code]);
    row[`${code}_detail`] = strOrNull(details[code]);
  }
  return row as CommunityServiceModel.CreateCommunityServiceInput;
}

export const communityServiceCategoriesController = {
  async create(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "community-services", "create");
    if (denied) return denied;

    const names = coerceLangMap(input.names);
    if (!names || !strOrNull(names.en)) {
      return { status: 400, body: { ok: false, message: "English name is required." } };
    }
    try {
      const payload = toCategoryPayload(names, input.status);
      const id = await CommunityServiceCategoryModel.createCommunityServiceCategory(payload);
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
    const denied = await requireRolePermission(session, "community-services", "edit");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid category id." } };
    }
    const names = coerceLangMap(input.names);
    if (!names || !strOrNull(names.en)) {
      return { status: 400, body: { ok: false, message: "English name is required." } };
    }
    try {
      const existing = await CommunityServiceCategoryModel.getCommunityServiceCategoryById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Category not found." } };
      const payload = toCategoryPayload(names, input.status);
      await CommunityServiceCategoryModel.updateCommunityServiceCategoryById(id, payload);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Update failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async remove(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "community-services", "delete");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid category id." } };
    }
    try {
      const existing = await CommunityServiceCategoryModel.getCommunityServiceCategoryById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Category not found." } };
      await CommunityServiceCategoryModel.deleteCommunityServiceCategoryById(id);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },
};

export const communityServicesTableController = {
  async create(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "community-services", "create");
    if (denied) return denied;
    const payload = toServicePayload(input);
    if (!payload) {
      return {
        status: 400,
        body: { ok: false, message: "English name and at least one category are required." },
      };
    }
    try {
      const id = await CommunityServiceModel.createCommunityService(payload);
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
    const denied = await requireRolePermission(session, "community-services", "edit");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid service id." } };
    }
    const payload = toServicePayload(input);
    if (!payload) {
      return {
        status: 400,
        body: { ok: false, message: "English name and at least one category are required." },
      };
    }
    try {
      const existing = await CommunityServiceModel.getCommunityServiceById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Service not found." } };
      const previousImage = existing.image;
      const nextImage = payload.image;
      await CommunityServiceModel.updateCommunityServiceById(id, payload);
      if (previousImage != null && previousImage !== nextImage) {
        try {
          await unlinkCommunityServiceStoredImage(previousImage);
        } catch (unlinkErr) {
          console.error("[community-services] Failed to remove previous image file:", unlinkErr);
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
    const denied = await requireRolePermission(session, "community-services", "delete");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid service id." } };
    }
    try {
      const existing = await CommunityServiceModel.getCommunityServiceById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Service not found." } };
      const imageToRemove = existing.image;
      await CommunityServiceModel.deleteCommunityServiceById(id);
      try {
        await unlinkCommunityServiceStoredImage(imageToRemove);
      } catch (unlinkErr) {
        console.error("[community-services] Failed to remove image file after delete:", unlinkErr);
      }
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },
};
