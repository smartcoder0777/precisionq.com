import { getAuthSession } from "@/lib/auth-session";
import { ALL_ROLE_PAGES, type RoleAction, type RoleActionMap } from "@/lib/role-permissions";
import * as RoleModel from "@/models/settings/role.model";
import * as RolePermissionModel from "@/models/settings/role-permission.model";
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

function isRoleAction(v: unknown): v is RoleAction {
  return v === "view" || v === "create" || v === "edit" || v === "delete";
}

function buildAllowedActionMap(): Map<string, Set<RoleAction>> {
  return new Map(ALL_ROLE_PAGES.map((p) => [p.key, new Set(p.actions)]));
}

function sanitizePermissions(input: unknown): RoleActionMap {
  if (!input || typeof input !== "object") return {};
  const allowed = buildAllowedActionMap();
  const out: RoleActionMap = {};
  for (const [pageKey, val] of Object.entries(input as Record<string, unknown>)) {
    const allowedActions = allowed.get(pageKey);
    if (!allowedActions || !Array.isArray(val)) continue;
    const uniq = Array.from(new Set(val.filter((x): x is RoleAction => isRoleAction(x))));
    const filtered = uniq.filter((a) => allowedActions.has(a));
    if (filtered.length > 0) {
      // Non-view actions imply view.
      if (filtered.some((a) => a !== "view") && !filtered.includes("view")) filtered.unshift("view");
      out[pageKey] = filtered;
    }
  }
  return out;
}

function rolePayload(input: Record<string, unknown>): RoleModel.CreateRoleInput | null {
  const name = strOrNull(input.name);
  if (!name) return null;
  return {
    code: strOrNull(input.code),
    name,
    description: strOrNull(input.description),
  };
}

export const rolesPermissionsController = {
  async createRole(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "roles-permissions", "create");
    if (denied) return denied;
    try {
      const payload = rolePayload(input);
      if (!payload) return { status: 400, body: { ok: false, message: "Role name is required." } };
      const id = await RoleModel.createRole(payload);
      return { status: 201, body: { ok: true, id } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Create role failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async updateRole(id: number, input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "roles-permissions", "edit");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) return { status: 400, body: { ok: false, message: "Invalid id." } };
    try {
      const existing = await RoleModel.getRoleById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Role not found." } };
      const payload = rolePayload(input);
      if (!payload) return { status: 400, body: { ok: false, message: "Role name is required." } };
      await RoleModel.updateRoleById(id, payload);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Update role failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async deleteRole(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "roles-permissions", "delete");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) return { status: 400, body: { ok: false, message: "Invalid id." } };
    try {
      const existing = await RoleModel.getRoleById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Role not found." } };
      await RolePermissionModel.replaceRolePermissions(id, []);
      await RoleModel.deleteRoleById(id);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete role failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async setRolePermissions(
    id: number,
    input: Record<string, unknown>,
  ): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "roles-permissions", "edit");
    if (denied) return denied;
    if (!Number.isFinite(id) || id <= 0) return { status: 400, body: { ok: false, message: "Invalid id." } };
    try {
      const existing = await RoleModel.getRoleById(id);
      if (!existing) return { status: 404, body: { ok: false, message: "Role not found." } };
      const sanitized = sanitizePermissions(input.permissions);
      const rows = Object.entries(sanitized).flatMap(([pageKey, actions]) =>
        actions.map((action) => ({ role_id: id, page_key: pageKey, action_key: action, value: 1 as const })),
      );
      await RolePermissionModel.replaceRolePermissions(id, rows);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Save permissions failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },
};
