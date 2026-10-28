import "server-only";

import path from "path";
import { unlink } from "fs/promises";

function normalizeStoredPath(stored: string): string {
  const s = stored.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (s.toLowerCase().startsWith("public/")) return s.slice("public/".length);
  return s;
}

/**
 * Deletes a QP media file under `public/qp/`.
 * Ignores non-local URLs and paths outside `qp/`.
 */
export async function unlinkQpStoredMedia(stored: string | null | undefined): Promise<void> {
  const raw = stored?.trim();
  if (!raw) return;
  if (/^(https?:|data:|blob:)/i.test(raw)) return;
  const rel = normalizeStoredPath(raw);
  if (!rel.toLowerCase().startsWith("qp/")) return;
  const abs = path.join(process.cwd(), "public", ...rel.split("/"));
  try {
    await unlink(abs);
  } catch {
    // ignore missing/unlink errors
  }
}
