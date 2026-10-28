import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";

const MAX_BYTES = 50 * 1024 * 1024;

const EDUCATION_DOC_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/rtf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text",
]);

function allowedMediaMime(mime: string): boolean {
  return mime.startsWith("image/") || mime.startsWith("video/");
}

function educationDocExtensionOk(filename: string): boolean {
  return /\.(pdf|doc|docx|txt|rtf|xls|xlsx|ppt|pptx|odt)$/i.test(filename);
}

function allowedEducationDocumentMime(mime: string, filename: string): boolean {
  const m = (mime || "").toLowerCase();
  if (EDUCATION_DOC_MIMES.has(m)) return true;
  if (m === "application/octet-stream" && educationDocExtensionOk(filename)) return true;
  if (!m && educationDocExtensionOk(filename)) return true;
  return false;
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid form data." }, { status: 400 });
  }

  const entry = formData.get("file");
  if (!entry || !(entry instanceof Blob)) {
    return NextResponse.json({ ok: false, message: "Missing file." }, { status: 400 });
  }

  const into = formData.get("into");
  const mime = entry.type || "application/octet-stream";
  const origNameEarly = entry instanceof File && typeof entry.name === "string" ? entry.name : "upload";

  if (into === "educations") {
    if (!allowedEducationDocumentMime(mime, origNameEarly)) {
      return NextResponse.json(
        { ok: false, message: "Only common document types (PDF, Word, Excel, PowerPoint, text, etc.) are allowed." },
        { status: 400 },
      );
    }
  } else if (!allowedMediaMime(mime)) {
    return NextResponse.json({ ok: false, message: "Only image or video uploads are allowed." }, { status: 400 });
  }

  if (entry.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, message: "File too large." }, { status: 400 });
  }

  const origName = origNameEarly;
  const ext = path.extname(origName).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".bin";
  const base = path
    .basename(origName, path.extname(origName))
    .replace(/[^a-z0-9-_]/gi, "_")
    .slice(0, 80) || "file";

  const relativePath =
    into === "community_services"
      ? `images/community_services/${Date.now()}-${base}${ext}`
      : into === "patient_services"
        ? `images/patient_services/${Date.now()}-${base}${ext}`
        : into === "insurances"
          ? `images/insurances/${Date.now()}-${base}${ext}`
          : into === "educations"
            ? `documents/educations/${Date.now()}-${base}${ext}`
            : into === "product_services"
              ? mime.startsWith("video/")
                ? `videos/product_services/${Date.now()}-${base}${ext}`
                : `images/product_services/${Date.now()}-${base}${ext}`
              : into === "qp"
                ? `qp/${Date.now()}-${base}${ext}`
              : into === "users"
                ? `images/users/${Date.now()}-${base}${ext}`
              : `uploads/${Date.now()}-${base}${ext}`;
  const absPath = path.join(process.cwd(), "public", ...relativePath.split("/"));

  await mkdir(path.dirname(absPath), { recursive: true });
  const buf = Buffer.from(await entry.arrayBuffer());
  await writeFile(absPath, buf);

  return NextResponse.json({ ok: true, filename: relativePath });
}
