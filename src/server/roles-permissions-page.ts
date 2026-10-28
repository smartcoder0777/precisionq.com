import "server-only";

import type { RoleActionMap } from "@/lib/role-permissions";
import * as RoleModel from "@/models/settings/role.model";
import * as RolePermissionModel from "@/models/settings/role-permission.model";

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  return String(v);
}

export type RoleSettingsRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  permissions: RoleActionMap;
};

export async function loadRolesPermissionsPagePayload(): Promise<{ rows: RoleSettingsRow[] }> {
  const roleRows = await RoleModel.getAllRoles();
  const roleIds = roleRows.map((r) => r.id).filter((id) => Number.isFinite(id));
  const permissionRows = await RolePermissionModel.getRolePermissionsByRoleIds(roleIds);

  const permMap = new Map<number, RoleActionMap>();
  for (const p of permissionRows) {
    if (!p.role_id || !p.page_key || !p.action_key || p.value !== 1) continue;
    const row = permMap.get(p.role_id) ?? {};
    const current = row[p.page_key] ?? [];
    if (!current.includes(p.action_key as never)) current.push(p.action_key as never);
    row[p.page_key] = current;
    permMap.set(p.role_id, row);
  }

  return {
    rows: roleRows.map((r) => ({
      id: String(r.id),
      code: toStr(r.code),
      name: toStr(r.name),
      description: toStr(r.description),
      permissions: permMap.get(r.id) ?? {},
    })),
  };
}
