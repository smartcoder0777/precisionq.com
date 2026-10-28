import "server-only";

import path from "path";
import { unlink } from "fs/promises";

function normalizeStoredPath(stored: string): string {
  const s = stored.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (s.toLowerCase().startsWith("public/")) return s.slice("public/".length);
  return s;
}

/**
 * Deletes a user photo file under `public/images/users/`.
 * Ignores external URLs and paths outside `images/users/`.
 */
export async function unlinkUserStoredPhoto(stored: string | null | undefined): Promise<void> {
  const raw = stored?.trim();
  if (!raw) return;
  if (/^(https?:|data:|blob:)/i.test(raw)) return;
  const rel = normalizeStoredPath(raw);
  if (!rel.toLowerCase().startsWith("images/users/")) return;
  const abs = path.join(process.cwd(), "public", ...rel.split("/"));
  try {
    await unlink(abs);
  } catch {
    // ignore missing/unlink errors
  }
}
