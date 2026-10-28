import "server-only";

import path from "path";
import { unlink } from "fs/promises";

const PUBLIC_ROOT = path.join(process.cwd(), "public");

function storedToDeletablePublicRelative(stored: string): string | null {
  const s = stored.trim();
  if (!s) return null;
  if (/^(https?:|data:|blob:)/i.test(s)) return null;
  const n = s.replace(/^\/+/, "");
  if (n.includes("..") || n.includes("\0")) return null;
  if (n.startsWith("documents/educations/")) return n;
  if (n.startsWith("uploads/")) return n;
  if (!n.includes("/")) return `documents/educations/${n}`;
  return null;
}

export async function unlinkEducationStoredDocument(stored: string | null | undefined): Promise<void> {
  if (stored == null || stored === "") return;
  const rel = storedToDeletablePublicRelative(String(stored));
  if (!rel) return;

  const abs = path.join(PUBLIC_ROOT, ...rel.split("/"));
  const resolvedPublic = path.resolve(PUBLIC_ROOT);
  const resolvedFile = path.resolve(abs);
  const relCheck = path.relative(resolvedPublic, resolvedFile);
  if (relCheck.startsWith("..") || path.isAbsolute(relCheck)) return;

  try {
    await unlink(resolvedFile);
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT" || code === "EISDIR") return;
    throw e;
  }
}
