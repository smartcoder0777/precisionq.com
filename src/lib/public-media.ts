/**
 * Media paths stored in the database are filenames (or paths) relative to `/public`.
 * Examples: `hero.jpg`, `uploads/2025-banner.png`. Full http(s), data:, and blob: URLs are
 * passed through unchanged for legacy or preview rows.
 */
export function publicAssetUrl(stored: string | null | undefined): string {
  const s = stored?.trim();
  if (!s) return "";
  if (/^(https?:|data:|blob:)/i.test(s)) return s;
  const normalized = s.replace(/^\/?public\//i, "");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

const USER_PHOTO_PREFIX = "images/users/";

/**
 * URL for a `users.photo` value stored as a path under `public/` (e.g. `images/users/…`).
 *
 * On many cPanel setups, the browser requests `https://example.com/images/...` against the
 * **Apache document root** (`public_html`), while uploads are written under the Node app’s
 * `public/` folder — so static `/images/users/…` returns 404 even though the file exists in
 * the app tree. This helper points avatars at `/api/media/...`, which is always handled by
 * Next.js and reads from `process.cwd()/public/`.
 */
export function userPhotoUrl(stored: string | null | undefined): string {
  const s = stored?.trim();
  if (!s) return "";
  if (/^(https?:|data:|blob:)/i.test(s)) return s;
  const normalized = s.replace(/^\/?public\//i, "").replace(/^\/+/, "");
  if (!normalized.startsWith(USER_PHOTO_PREFIX)) {
    return publicAssetUrl(stored);
  }
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length !== 3 || segments[0] !== "images" || segments[1] !== "users") {
    return publicAssetUrl(stored);
  }
  return `/api/media/${segments.map((p) => encodeURIComponent(p)).join("/")}`;
}

const COMMUNITY_SERVICES_IMAGE_PREFIX = "images/community_services/";

/**
 * URL for a community service `image` value stored relative to `/public`.
 * Bare filenames resolve under `images/community_services/`. Values that already include
 * that prefix, or other relative paths (e.g. legacy `uploads/…`), use {@link publicAssetUrl}.
 */
export function communityServiceImageUrl(stored: string | null | undefined): string {
  const s = stored?.trim();
  if (!s) return "";
  if (/^(https?:|data:|blob:)/i.test(s)) return s;
  const noLeadingSlash = s.replace(/^\/+/, "");
  if (noLeadingSlash.startsWith(COMMUNITY_SERVICES_IMAGE_PREFIX)) {
    return publicAssetUrl(noLeadingSlash);
  }
  if (noLeadingSlash.includes("/")) {
    return publicAssetUrl(noLeadingSlash);
  }
  return publicAssetUrl(`${COMMUNITY_SERVICES_IMAGE_PREFIX}${noLeadingSlash}`);
}

const PATIENT_SERVICES_IMAGE_PREFIX = "images/patient_services/";

/** Same rules as {@link communityServiceImageUrl} for `public/images/patient_services/`. */
export function patientServiceImageUrl(stored: string | null | undefined): string {
  const s = stored?.trim();
  if (!s) return "";
  if (/^(https?:|data:|blob:)/i.test(s)) return s;
  const noLeadingSlash = s.replace(/^\/+/, "");
  if (noLeadingSlash.startsWith(PATIENT_SERVICES_IMAGE_PREFIX)) {
    return publicAssetUrl(noLeadingSlash);
  }
  if (noLeadingSlash.includes("/")) {
    return publicAssetUrl(noLeadingSlash);
  }
  return publicAssetUrl(`${PATIENT_SERVICES_IMAGE_PREFIX}${noLeadingSlash}`);
}

const INSURANCES_IMAGE_PREFIX = "images/insurances/";

/**
 * URL for an `insurances.img` value stored relative to `/public`.
 * Paths already under `images/insurances/` (or any path with a slash) use {@link publicAssetUrl};
 * bare filenames resolve under `public/images/insurances/`.
 */
export function insuranceImageUrl(stored: string | null | undefined): string {
  const s = stored?.trim();
  if (!s) return "";
  if (/^(https?:|data:|blob:)/i.test(s)) return s;
  const noLeadingSlash = s.replace(/^\/+/, "");
  if (noLeadingSlash.startsWith(INSURANCES_IMAGE_PREFIX)) {
    return publicAssetUrl(noLeadingSlash);
  }
  if (noLeadingSlash.includes("/")) {
    return publicAssetUrl(noLeadingSlash);
  }
  return publicAssetUrl(`${INSURANCES_IMAGE_PREFIX}${noLeadingSlash}`);
}

const EDUCATION_DOCUMENTS_PREFIX = "documents/educations/";

/**
 * Public URL for an education document path stored relative to `/public`.
 * Bare filenames resolve under `documents/educations/`.
 */
const PRODUCT_SERVICES_IMAGE_PREFIX = "images/product_services/";
const PRODUCT_SERVICES_VIDEO_PREFIX = "videos/product_services/";
const QP_MEDIA_PREFIX = "qp/";

/** Stored image path under `public/images/product_services/` (or legacy path / bare filename). */
export function productServiceImageUrl(stored: string | null | undefined): string {
  const s = stored?.trim();
  if (!s) return "";
  if (/^(https?:|data:|blob:)/i.test(s)) return s;
  const noLeadingSlash = s.replace(/^\/+/, "");
  if (noLeadingSlash.startsWith(PRODUCT_SERVICES_IMAGE_PREFIX)) {
    return publicAssetUrl(noLeadingSlash);
  }
  if (noLeadingSlash.includes("/")) {
    return publicAssetUrl(noLeadingSlash);
  }
  return publicAssetUrl(`${PRODUCT_SERVICES_IMAGE_PREFIX}${noLeadingSlash}`);
}

/** Stored video path under `public/videos/product_services/` (or legacy path / bare filename). */
export function productServiceVideoUrl(stored: string | null | undefined): string {
  const s = stored?.trim();
  if (!s) return "";
  if (/^(https?:|data:|blob:)/i.test(s)) return s;
  const noLeadingSlash = s.replace(/^\/+/, "");
  if (noLeadingSlash.startsWith(PRODUCT_SERVICES_VIDEO_PREFIX)) {
    return publicAssetUrl(noLeadingSlash);
  }
  if (noLeadingSlash.includes("/")) {
    return publicAssetUrl(noLeadingSlash);
  }
  return publicAssetUrl(`${PRODUCT_SERVICES_VIDEO_PREFIX}${noLeadingSlash}`);
}

/** Stored media path under `public/qp/` (or legacy path / bare filename). */
export function qpMediaUrl(stored: string | null | undefined): string {
  const s = stored?.trim();
  if (!s) return "";
  if (/^(https?:|data:|blob:)/i.test(s)) return s;
  const noLeadingSlash = s.replace(/^\/+/, "");
  if (noLeadingSlash.startsWith(QP_MEDIA_PREFIX)) {
    return publicAssetUrl(noLeadingSlash);
  }
  if (noLeadingSlash.includes("/")) {
    return publicAssetUrl(noLeadingSlash);
  }
  return publicAssetUrl(`${QP_MEDIA_PREFIX}${noLeadingSlash}`);
}

export function educationDocumentUrl(stored: string | null | undefined): string {
  const s = stored?.trim();
  if (!s) return "";
  if (/^(https?:|data:|blob:)/i.test(s)) return s;
  const noLeadingSlash = s.replace(/^\/+/, "");
  if (noLeadingSlash.startsWith(EDUCATION_DOCUMENTS_PREFIX)) {
    return publicAssetUrl(noLeadingSlash);
  }
  if (noLeadingSlash.includes("/")) {
    return publicAssetUrl(noLeadingSlash);
  }
  return publicAssetUrl(`${EDUCATION_DOCUMENTS_PREFIX}${noLeadingSlash}`);
}
