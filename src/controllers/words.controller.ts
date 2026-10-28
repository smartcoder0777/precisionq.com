import { getAuthSession } from "@/lib/auth-session";
import * as WordsModel from "@/models/settings/words.model";
import type { HttpResult } from "./health.controller";
import { requireRolePermission } from "./_permission";

function strOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function toPayload(input: Record<string, unknown>): WordsModel.CreateWordInput | null {
  const code = strOrNull(input.code);
  if (!code) return null;
  return {
    code,
    color: strOrNull(input.color) ?? "#2563eb",
    display: strOrNull(input.display),
    description: strOrNull(input.description),
  };
}

export const wordsController = {
  async create(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return { status: 401, body: { ok: false, message: "Unauthorized." } };
    const denied = await requireRolePermission(session, "settings-qp", "edit");
    if (denied) return denied;
    try {
      const payload = toPayload(input);
      if (!payload) return { status: 400, body: { ok: false, message: "Word code is required." } };
      const id = await WordsModel.createWord(payload);
      return { status: 201, body: { ok: true, id } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Create failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async update(id: number, input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return { status: 401, body: { ok: false, message: "Unauthorized." } };
    const denied = await requireRolePermission(session, "settings-qp", "edit");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) return { status: 400, body: { ok: false, message: "Invalid id." } };
    try {
      const existing = await WordsModel.getWordById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Word not found." } };
      const payload = toPayload(input);
      if (!payload) return { status: 400, body: { ok: false, message: "Word code is required." } };
      await WordsModel.updateWordById(id, payload);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Update failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async remove(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return { status: 401, body: { ok: false, message: "Unauthorized." } };
    const denied = await requireRolePermission(session, "settings-qp", "edit");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) return { status: 400, body: { ok: false, message: "Invalid id." } };
    try {
      const existing = await WordsModel.getWordById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Word not found." } };
      await WordsModel.deleteWordById(id);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async setAllColor(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return { status: 401, body: { ok: false, message: "Unauthorized." } };
    const denied = await requireRolePermission(session, "settings-qp", "edit");
    if (denied) return denied;
    try {
      const color = strOrNull(input.color);
      if (!color) return { status: 400, body: { ok: false, message: "Color is required." } };
      await WordsModel.updateAllWordsColor(color);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Update failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },
};
