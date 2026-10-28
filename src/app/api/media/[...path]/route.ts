import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

/**
 * Serves files from `public/` that must be reachable even when the host (e.g. cPanel Apache)
 * maps the site document root to `public_html` while the Node app (and uploads) live under
 * the application directory — direct `/images/...` URLs would 404 there.
 *
 * Only whitelisted relative paths are allowed (path traversal rejected).
 */
const ALLOWED_UNDER_PUBLIC: readonly string[][] = [["images", "users"]];

function mimeForExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

function isAllowed(segments: string[]): boolean {
  if (segments.length === 0 || segments.some((s) => s === "" || s === "." || s === ".." || s.includes("/"))) {
    return false;
  }
  return ALLOWED_UNDER_PUBLIC.some(
    (prefix) => prefix.length <= segments.length && prefix.every((p, i) => segments[i] === p),
  );
}

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await context.params;
  if (!isAllowed(segments)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const absFile = path.join(process.cwd(), "public", ...segments);
  const absPublic = path.resolve(process.cwd(), "public");
  if (!absFile.startsWith(absPublic + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!existsSync(absFile)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buf = await readFile(absFile);
  const ext = path.extname(absFile);
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": mimeForExt(ext),
      "Cache-Control": "public, max-age=86400",
    },
  });
}
