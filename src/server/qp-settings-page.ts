import "server-only";

import { getSettingsByCodes } from "@/models/setting.model";
import * as WordsModel from "@/models/settings/words.model";

const QP_CODES = {
  BG_IMAGE: "bg_image",
  BG_VIDEO: "bg_video",
  BG_STATUS: "bg_status",
  BG_FOOTER: "bg_footer",
} as const;

export type QpWordRow = {
  id: string;
  code: string;
  color: string;
  display: string;
  description: string;
};

export type QpSettingsPayload = {
  words: QpWordRow[];
  settings: {
    bgImage: string;
    bgVideo: string;
    bgStatus: "image" | "video";
    footerText: string;
  };
};

export async function loadQpSettingsPagePayload(): Promise<QpSettingsPayload> {
  const [words, settingsRows] = await Promise.all([
    WordsModel.getAllWords(),
    getSettingsByCodes(Object.values(QP_CODES)),
  ]);
  const byCode = new Map(settingsRows.map((r) => [String(r.code ?? ""), r]));
  return {
    words: words.map((w) => ({
      id: String(w.id),
      code: String(w.code ?? ""),
      color: String(w.color ?? "#2563eb"),
      display: String(w.display ?? ""),
      description: String(w.description ?? ""),
    })),
    settings: {
      bgImage: String(byCode.get(QP_CODES.BG_IMAGE)?.display ?? ""),
      bgVideo: String(byCode.get(QP_CODES.BG_VIDEO)?.display ?? ""),
      bgStatus: String(byCode.get(QP_CODES.BG_STATUS)?.display ?? "image").toLowerCase() === "video" ? "video" : "image",
      footerText: String(byCode.get(QP_CODES.BG_FOOTER)?.detail ?? ""),
    },
  };
}
