import type { AuthSession } from "@/lib/auth-session";
import { hasRolePermission } from "@/models/settings/role-permission.model";
import type { HttpResult } from "./health.controller";
import type { RoleAction } from "@/lib/role-permissions";

export async function forbidden(): Promise<HttpResult<{ ok: false; message: string }>> {
  return { status: 403, body: { ok: false, message: "You don't have accesss about this action!" } };
}

export async function requireRolePermission(
  session: AuthSession,
  pageKey: string,
  action: RoleAction,
): Promise<HttpResult<{ ok: false; message: string }> | null> {
  if (!session.roleId) return forbidden();
  const normalize = (v: string) => String(v).toLowerCase().replace(/[\s_-]+/g, "-");
  const wantedPage = normalize(pageKey);
  const wantedAction = normalize(action);
  if (session.permissions) {
    const actions = session.permissions[wantedPage] ?? [];
    if (actions.includes(wantedAction)) return null;
    if (wantedPage.startsWith("settings-")) {
      const legacySettingsActions = session.permissions.settings ?? [];
      if (legacySettingsActions.includes(wantedAction)) return null;
      if (wantedAction !== "view" && legacySettingsActions.includes("edit")) return null;
    }
  }
  const allowed = await hasRolePermission(session.roleId, pageKey, action);
  if (allowed) return null;
  if (wantedPage.startsWith("settings-")) {
    const legacyAllowed = await hasRolePermission(
      session.roleId,
      "settings",
      wantedAction === "view" ? "view" : "edit",
    );
    if (legacyAllowed) return null;
  }
  return forbidden();
}
