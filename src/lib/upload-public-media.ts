import { API_ROUTES } from "@/routes";

export type PublicUploadInto =
  | "uploads"
  | "users"
  | "community_services"
  | "patient_services"
  | "insurances"
  | "educations"
  | "product_services"
  | "qp";

/** Uploads a file via API into `public/uploads/`, `public/images/…`, `public/videos/…`, or `public/documents/educations/`; returns the stored path. */
export async function uploadPublicMedia(
  file: File,
  options?: { into?: PublicUploadInto },
): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  if (options?.into === "community_services") {
    fd.append("into", "community_services");
  }
  if (options?.into === "patient_services") {
    fd.append("into", "patient_services");
  }
  if (options?.into === "insurances") {
    fd.append("into", "insurances");
  }
  if (options?.into === "educations") {
    fd.append("into", "educations");
  }
  if (options?.into === "product_services") {
    fd.append("into", "product_services");
  }
  if (options?.into === "qp") {
    fd.append("into", "qp");
  }
  if (options?.into === "users") {
    fd.append("into", "users");
  }
  const res = await fetch(API_ROUTES.PUBLIC_UPLOAD, { method: "POST", body: fd });
  const data = (await res.json()) as { ok?: boolean; filename?: string; message?: string };
  if (!res.ok || !data.ok || !data.filename) {
    throw new Error(data.message || "Upload failed.");
  }
  return data.filename;
}
