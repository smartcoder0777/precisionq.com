import { getAuthSession } from "@/lib/auth-session";
import { upsertGeneralSettingsRow } from "@/models/settings/general-settings.model";
import {
  DEFAULT_GENERAL_SETTINGS,
  type AlertPosition,
  type GeneralSettingsState,
  loadGeneralSettings,
  type SidebarColor,
  type ThemeMode,
} from "@/server/general-settings";
import type { HttpResult } from "./health.controller";
import { requireRolePermission } from "./_permission";

function toInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toTheme(v: unknown): ThemeMode {
  return String(v).toLowerCase() === "dark" ? "dark" : "light";
}

function toSidebarColor(v: unknown): SidebarColor {
  const s = String(v).toLowerCase();
  if (s === "slate" || s === "green" || s === "purple" || s === "teal" || s === "orange" || s === "rose") return s;
  return "blue";
}

function toAlertPosition(v: unknown): AlertPosition {
  const s = String(v).toLowerCase();
  if (s === "top-right" || s === "top-left" || s === "bottom-left") return s;
  return "bottom-right";
}

function normalizeInput(input: Record<string, unknown>): GeneralSettingsState {
  const ttl = toInt(input.sessionTtlSeconds) ?? DEFAULT_GENERAL_SETTINGS.sessionTtlSeconds;
  return {
    sessionTtlSeconds: Math.max(300, Math.min(60 * 60 * 24 * 30, ttl)),
    themeMode: toTheme(input.themeMode),
    sidebarColor: toSidebarColor(input.sidebarColor),
    alertPosition: toAlertPosition(input.alertPosition),
  };
}

export const generalSettingsController = {
  async get(): Promise<HttpResult<{ ok: boolean; settings?: GeneralSettingsState; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return { status: 401, body: { ok: false, message: "Unauthorized." } };
    const denied = await requireRolePermission(session, "settings-general", "view");
    if (denied) return denied;
    const settings = await loadGeneralSettings();
    return { status: 200, body: { ok: true, settings } };
  },

  async save(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; settings?: GeneralSettingsState; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return { status: 401, body: { ok: false, message: "Unauthorized." } };
    const denied = await requireRolePermission(session, "settings-general", "edit");
    if (denied) return denied;

    const settings = normalizeInput(input);
    await upsertGeneralSettingsRow({
      session_ttl_seconds: settings.sessionTtlSeconds,
      theme_mode: settings.themeMode,
      sidebar_color: settings.sidebarColor,
      alert_position: settings.alertPosition,
    });
    return { status: 200, body: { ok: true, settings } };
  },

  async getPublic(): Promise<HttpResult<{ ok: boolean; settings?: GeneralSettingsState; message?: string }>> {
    try {
      const settings = await loadGeneralSettings();
      return { status: 200, body: { ok: true, settings } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load settings.";
      return { status: 500, body: { ok: false, message } };
    }
  },
};
