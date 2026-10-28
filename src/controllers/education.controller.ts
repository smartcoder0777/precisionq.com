/**
 * Admin CRUD for `educations`.
 */
import { SUPPORTED_LANGUAGES } from "@/lib/supported-languages";
import { collectEducationDocumentPaths } from "@/lib/education-db-mapper";
import { getAuthSession } from "@/lib/auth-session";
import { unlinkEducationStoredDocument } from "@/lib/server/unlink-education-document";
import * as EducationModel from "@/models/education.model";
import type { LangDocument } from "@/types/education-page";
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

function coerceDocuments(v: unknown): Partial<Record<string, LangDocument>> {
  if (!v || typeof v !== "object") return {};
  const src = v as Record<string, unknown>;
  const out: Partial<Record<string, LangDocument>> = {};
  for (const { code } of SUPPORTED_LANGUAGES) {
    const x = src[code];
    if (!x || typeof x !== "object") continue;
    const o = x as { path?: unknown; displayName?: unknown; sizeLabel?: unknown };
    const path = typeof o.path === "string" ? o.path.trim() : "";
    if (!path) continue;
    out[code] = {
      path,
      displayName:
        typeof o.displayName === "string" && o.displayName.trim()
          ? o.displayName.trim()
          : path.split("/").pop() || path,
      sizeLabel: typeof o.sizeLabel === "string" && o.sizeLabel.trim() ? o.sizeLabel.trim() : "—",
    };
  }
  return out;
}

function documentPathsSet(docs: Partial<Record<string, LangDocument>>): Set<string> {
  const s = new Set<string>();
  for (const d of Object.values(docs)) {
    if (d?.path?.trim()) s.add(d.path.trim());
  }
  return s;
}

/** Content columns only (no timestamps). */
function toDbContent(body: Record<string, unknown>): Omit<EducationModel.CreateEducationInput, "createdAt" | "updatedAt"> | null {
  const page = strOrNull(body.pageName);
  if (!page) return null;
  const title = coerceLangMap(body.title);
  if (!title || !strOrNull(title.en)) return null;
  const description = coerceLangMap(body.description) ?? {};
  const documents = coerceDocuments(body.documents);

  const row: Record<string, string | null> = { page };
  for (const { code } of SUPPORTED_LANGUAGES) {
    row[`title_${code}`] = strOrNull(title[code]);
    row[`desc_${code}`] = strOrNull(description[code]);
    row[`file_${code}`] = strOrNull(documents[code]?.path);
  }
  return row as Omit<EducationModel.CreateEducationInput, "createdAt" | "updatedAt">;
}

async function unlinkPathsNotIn(nextPaths: Set<string>, previousPaths: string[]): Promise<void> {
  for (const p of previousPaths) {
    if (!nextPaths.has(p)) {
      try {
        await unlinkEducationStoredDocument(p);
      } catch (e) {
        console.error("[educations] Failed to unlink removed document:", e);
      }
    }
  }
}

export const educationController = {
  async create(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "education", "create");
    if (denied) return denied;
    const content = toDbContent(input);
    if (!content) {
      return { status: 400, body: { ok: false, message: "Page name and English title are required." } };
    }
    const now = new Date();
    const payload: EducationModel.CreateEducationInput = { ...content, createdAt: now, updatedAt: now };
    try {
      const id = await EducationModel.createEducation(payload);
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
    const denied = await requireRolePermission(session, "education", "edit");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid id." } };
    }
    const content = toDbContent(input);
    if (!content) {
      return { status: 400, body: { ok: false, message: "Page name and English title are required." } };
    }
    try {
      const existing = await EducationModel.getEducationById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Record not found." } };
      const previousPaths = collectEducationDocumentPaths(existing);
      const nextPaths = documentPathsSet(coerceDocuments(input.documents));
      await unlinkPathsNotIn(nextPaths, previousPaths);
      const payload: EducationModel.EducationUpdatePatch = {
        ...content,
        createdAt: existing.createdAt,
        updatedAt: new Date(),
      };
      await EducationModel.updateEducationById(id, payload);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Update failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async remove(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "education", "delete");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid id." } };
    }
    try {
      const existing = await EducationModel.getEducationById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Record not found." } };
      for (const p of collectEducationDocumentPaths(existing)) {
        try {
          await unlinkEducationStoredDocument(p);
        } catch (e) {
          console.error("[educations] Failed to unlink document on delete:", e);
        }
      }
      await EducationModel.deleteEducationById(id);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },
};
