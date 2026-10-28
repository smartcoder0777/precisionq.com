import { getAuthSession } from "@/lib/auth-session";
import * as SecurityQuestionModel from "@/models/settings/security-question.model";
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

function toPayload(input: Record<string, unknown>): SecurityQuestionModel.CreateSecurityQuestionInput | null {
  const question = strOrNull(input.question);
  if (!question) return null;
  return {
    question,
    status: statusToDb(input.status),
  };
}

export const securityQuestionsController = {
  async create(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "settings-security-question", "edit");
    if (denied) return denied;
    try {
      const payload = toPayload(input);
      if (!payload) return { status: 400, body: { ok: false, message: "Question is required." } };
      const id = await SecurityQuestionModel.createSecurityQuestion(payload);
      return { status: 201, body: { ok: true, id } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Create failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async update(id: number, input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "settings-security-question", "edit");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) return { status: 400, body: { ok: false, message: "Invalid id." } };
    try {
      const existing = await SecurityQuestionModel.getSecurityQuestionById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Security question not found." } };
      const payload = toPayload(input);
      if (!payload) return { status: 400, body: { ok: false, message: "Question is required." } };
      await SecurityQuestionModel.updateSecurityQuestionById(id, payload);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Update failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async remove(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "settings-security-question", "edit");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) return { status: 400, body: { ok: false, message: "Invalid id." } };
    try {
      const existing = await SecurityQuestionModel.getSecurityQuestionById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Security question not found." } };
      await SecurityQuestionModel.deleteSecurityQuestionById(id);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },
};
