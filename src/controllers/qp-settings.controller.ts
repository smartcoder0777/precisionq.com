import { getAuthSession } from "@/lib/auth-session";
import { getSettingsByCodes, upsertSettingByCode } from "@/models/setting.model";
import type { HttpResult } from "./health.controller";
import { requireRolePermission } from "./_permission";
import { unlinkQpStoredMedia } from "@/lib/server/unlink-qp-media";

const QP_CODES = {
  BG_IMAGE: "bg_image",
  BG_VIDEO: "bg_video",
  BG_STATUS: "bg_status",
  BG_FOOTER: "bg_footer",
} as const;

export type QpUiSettings = {
  bgImage: string;
  bgVideo: string;
  bgStatus: "image" | "video";
  footerText: string;
};

function fromRows(rows: Awaited<ReturnType<typeof getSettingsByCodes>>): QpUiSettings {
  const byCode = new Map(rows.map((r) => [String(r.code ?? ""), r]));
  const bgStatus = String(byCode.get(QP_CODES.BG_STATUS)?.display ?? "image").toLowerCase() === "video" ? "video" : "image";
  return {
    bgImage: String(byCode.get(QP_CODES.BG_IMAGE)?.display ?? ""),
    bgVideo: String(byCode.get(QP_CODES.BG_VIDEO)?.display ?? ""),
    bgStatus,
    footerText: String(byCode.get(QP_CODES.BG_FOOTER)?.detail ?? ""),
  };
}

export const qpSettingsController = {
  async get(): Promise<HttpResult<{ ok: boolean; settings?: QpUiSettings; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return { status: 401, body: { ok: false, message: "Unauthorized." } };
    const denied = await requireRolePermission(session, "settings-qp", "view");
    if (denied) return denied;
    const rows = await getSettingsByCodes(Object.values(QP_CODES));
    return { status: 200, body: { ok: true, settings: fromRows(rows) } };
  },

  async save(input: Record<string, unknown>): Promise<HttpResult<{ ok: boolean; settings?: QpUiSettings; message?: string }>> {
    const session = await getAuthSession();
    if (!session) return { status: 401, body: { ok: false, message: "Unauthorized." } };
    const denied = await requireRolePermission(session, "settings-qp", "edit");
    if (denied) return denied;
    const bgStatus = String(input.bgStatus ?? "image").toLowerCase() === "video" ? "video" : "image";
    const bgImage = String(input.bgImage ?? "");
    const bgVideo = String(input.bgVideo ?? "");
    const footerText = String(input.footerText ?? "");
    if (bgStatus === "image" && !bgImage.trim()) {
      return { status: 400, body: { ok: false, message: "Please upload a background image first." } };
    }
    if (bgStatus === "video" && !bgVideo.trim()) {
      return { status: 400, body: { ok: false, message: "Please upload a background video first." } };
    }

    const currentRows = await getSettingsByCodes(Object.values(QP_CODES));
    const current = fromRows(currentRows);
    if (current.bgImage && current.bgImage !== bgImage) await unlinkQpStoredMedia(current.bgImage);
    if (current.bgVideo && current.bgVideo !== bgVideo) await unlinkQpStoredMedia(current.bgVideo);

    await upsertSettingByCode({ code: QP_CODES.BG_IMAGE, display: bgImage, detail: "" });
    await upsertSettingByCode({ code: QP_CODES.BG_VIDEO, display: bgVideo, detail: "" });
    await upsertSettingByCode({ code: QP_CODES.BG_STATUS, display: bgStatus, detail: "" });
    await upsertSettingByCode({ code: QP_CODES.BG_FOOTER, display: "footer", detail: footerText });

    return {
      status: 200,
      body: { ok: true, settings: { bgImage, bgVideo, bgStatus, footerText } },
    };
  },
};
