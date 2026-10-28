/**
 * Admin CRUD for `agreements`: one DB row per agreement with per-locale `*_name` / `*_desc` columns.
 */
import { SUPPORTED_LANGUAGES } from "@/lib/supported-languages";
import { getAuthSession } from "@/lib/auth-session";
import * as AgreementModel from "@/models/agreement.model";
import type { AgreementRecord, CreateAgreementInput } from "@/models/agreement.model";
import { agreementRecordToCreateInput, emptyAgreementCreateInput } from "@/models/agreement.model";
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

function parseStatus(v: unknown): number {
  if (v === 1 || v === "1" || v === true) return 1;
  if (typeof v === "string" && v.toLowerCase() === "active") return 1;
  if (typeof v === "string" && v.toLowerCase() === "inactive") return 0;
  const n = Number(v);
  return n === 1 ? 1 : 0;
}

function buildCreateAgreementInput(
  existing: AgreementRecord | null,
  fields: {
    name: string;
    type: string;
    status: number;
    clinicCsv: string;
    content: Record<string, string>;
  },
): CreateAgreementInput {
  const { name, type, status, clinicCsv, content } = fields;
  const base = existing ? agreementRecordToCreateInput(existing) : emptyAgreementCreateInput();
  base.clinic_id = clinicCsv;
  base.type = type;
  base.status = status;
  base.en_name = name;

  if (!existing) {
    for (const { code } of SUPPORTED_LANGUAGES) {
      if (code !== "en") {
        const k = `${code}_name` as keyof CreateAgreementInput;
        base[k] = null;
      }
    }
  }

  for (const { code } of SUPPORTED_LANGUAGES) {
    const raw = typeof content[code] === "string" ? content[code] : "";
    const k = `${code}_desc` as keyof CreateAgreementInput;
    base[k] = raw.trim() ? raw : null;
  }

  const anyDesc = SUPPORTED_LANGUAGES.some(({ code }) => {
    const raw = typeof content[code] === "string" ? content[code] : "";
    return raw.replace(/<[^>]*>/g, "").trim().length > 0;
  });
  base.completed = anyDesc ? 1 : 0;

  return base;
}

export const agreementsController = {
  async create(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "agreements", "create");
    if (denied) return denied;

    const name = strOrNull(input.name);
    const type = strOrNull(input.type);
    if (!name || !type) {
      return { status: 400, body: { ok: false, message: "Name and type are required." } };
    }

    const clinicIdsRaw = input.clinicIds;
    if (!Array.isArray(clinicIdsRaw) || clinicIdsRaw.length === 0) {
      return { status: 400, body: { ok: false, message: "At least one clinic is required." } };
    }
    const clinicIds = [...new Set(clinicIdsRaw.map(x => Number(x)).filter(n => Number.isFinite(n) && n > 0))].sort(
      (a, b) => a - b,
    );
    if (clinicIds.length === 0) {
      return { status: 400, body: { ok: false, message: "Invalid clinic ids." } };
    }
    const clinicCsv = clinicIds.join(",");

    const content = input.content;
    if (!content || typeof content !== "object") {
      return { status: 400, body: { ok: false, message: "content object is required." } };
    }
    const contentMap = content as Record<string, unknown>;

    try {
      const payload = buildCreateAgreementInput(null, {
        name,
        type,
        status: parseStatus(input.status ?? 1),
        clinicCsv,
        content: Object.fromEntries(
          SUPPORTED_LANGUAGES.map(({ code }) => [code, String(contentMap[code] ?? "")]),
        ) as Record<string, string>,
      });
      await AgreementModel.createAgreement(payload);
      return { status: 201, body: { ok: true } };
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
    const denied = await requireRolePermission(session, "agreements", "edit");
    if (denied) return denied;

    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid agreement id." } };
    }

    const name = strOrNull(input.name);
    const type = strOrNull(input.type);
    if (!name || !type) {
      return { status: 400, body: { ok: false, message: "Name and type are required." } };
    }

    const clinicIdsRaw = input.clinicIds;
    if (!Array.isArray(clinicIdsRaw) || clinicIdsRaw.length === 0) {
      return { status: 400, body: { ok: false, message: "At least one clinic is required." } };
    }
    const clinicIds = [...new Set(clinicIdsRaw.map(x => Number(x)).filter(n => Number.isFinite(n) && n > 0))].sort(
      (a, b) => a - b,
    );
    if (clinicIds.length === 0) {
      return { status: 400, body: { ok: false, message: "Invalid clinic ids." } };
    }
    const clinicCsv = clinicIds.join(",");

    const content = input.content;
    if (!content || typeof content !== "object") {
      return { status: 400, body: { ok: false, message: "content object is required." } };
    }
    const contentMap = content as Record<string, unknown>;

    try {
      const existing = await AgreementModel.getAgreementById(id);
      if (!existing) {
        return { status: 404, body: { ok: false, message: "Agreement not found." } };
      }
      const payload = buildCreateAgreementInput(existing, {
        name,
        type,
        status: parseStatus(input.status ?? 1),
        clinicCsv,
        content: Object.fromEntries(
          SUPPORTED_LANGUAGES.map(({ code }) => [code, String(contentMap[code] ?? "")]),
        ) as Record<string, string>,
      });
      await AgreementModel.updateAgreementById(id, payload);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Update failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async remove(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "agreements", "delete");
    if (denied) return denied;

    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid agreement id." } };
    }

    try {
      const existing = await AgreementModel.getAgreementById(id);
      if (!existing) {
        return { status: 404, body: { ok: false, message: "Agreement not found." } };
      }
      await AgreementModel.deleteAgreementsByIds([id]);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },
};
