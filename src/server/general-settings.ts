import "server-only";

import { getGeneralSettingsRow } from "@/models/settings/general-settings.model";

export type ThemeMode = "light" | "dark";
export type SidebarColor = "blue" | "slate" | "green" | "purple" | "teal" | "orange" | "rose";
export type AlertPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";

export type GeneralSettingsState = {
  sessionTtlSeconds: number;
  themeMode: ThemeMode;
  sidebarColor: SidebarColor;
  alertPosition: AlertPosition;
};

export const DEFAULT_GENERAL_SETTINGS: GeneralSettingsState = {
  sessionTtlSeconds: 86400,
  themeMode: "light",
  sidebarColor: "blue",
  alertPosition: "bottom-right",
};

function normalizeSettings(row: {
  session_ttl_seconds: number | null;
  theme_mode: string | null;
  sidebar_color: string | null;
  alert_position: string | null;
} | null): GeneralSettingsState {
  const ttl = Number(row?.session_ttl_seconds ?? DEFAULT_GENERAL_SETTINGS.sessionTtlSeconds);
  const sessionTtlSeconds = Number.isFinite(ttl) ? Math.max(300, Math.min(60 * 60 * 24 * 30, Math.trunc(ttl))) : DEFAULT_GENERAL_SETTINGS.sessionTtlSeconds;

  const theme = String(row?.theme_mode ?? DEFAULT_GENERAL_SETTINGS.themeMode).toLowerCase();
  const themeMode: ThemeMode = theme === "dark" ? "dark" : "light";

  const sidebarRaw = String(row?.sidebar_color ?? DEFAULT_GENERAL_SETTINGS.sidebarColor).toLowerCase();
  const sidebarColor: SidebarColor =
    sidebarRaw === "slate" ||
    sidebarRaw === "green" ||
    sidebarRaw === "purple" ||
    sidebarRaw === "teal" ||
    sidebarRaw === "orange" ||
    sidebarRaw === "rose"
      ? sidebarRaw
      : "blue";

  const alertRaw = String(row?.alert_position ?? DEFAULT_GENERAL_SETTINGS.alertPosition).toLowerCase();
  const alertPosition: AlertPosition =
    alertRaw === "top-right" || alertRaw === "top-left" || alertRaw === "bottom-left" ? alertRaw : "bottom-right";

  return { sessionTtlSeconds, themeMode, sidebarColor, alertPosition };
}

export async function loadGeneralSettings(): Promise<GeneralSettingsState> {
  const row = await getGeneralSettingsRow();
  return normalizeSettings(row);
}
