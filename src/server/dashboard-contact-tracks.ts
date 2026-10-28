import "server-only";

import type { DashboardContactTrackRow } from "@/types/dashboard-contact-track";
import type { ContactTrackWithResolvedClinic } from "@/models/contact-track.model";
import * as ContactTrackModel from "@/models/contact-track.model";
import { formatUsDate } from "@/lib/date-format";
import { formatUsPhoneDisplay } from "@/lib/phone-format";

/** Coerce mysql2 values (including `Date` for DATE/DATETIME) to display text. */
export function toDisplayString(value: unknown, empty = "—"): string {
  if (value === null || value === undefined) return empty;
  if (value instanceof Date) {
    return formatUsDate(value, empty);
  }
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : empty;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return empty;
    const maybeDate = formatUsDate(trimmed, "");
    if (maybeDate) return maybeDate;
    return trimmed;
  }
  return String(value);
}

function toMessageString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) return value.toString("utf8");
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString();
  }
  return String(value);
}

/** Adjust if your DB uses different numeric codes for `contact_tracks.priority`. */
function mapPriority(value: number | null): DashboardContactTrackRow["priority"] {
  switch (value) {
    case 1:
      return "High";
    case 2:
      return "Medium";
    case 3:
      return "Low";
    default:
      return "Low";
  }
}

/** Adjust if your DB uses different numeric codes for `contact_tracks.status`. */
function mapStatus(value: number | null): DashboardContactTrackRow["status"] {
  switch (value) {
    case 1:
      return "Open";
    case 2:
      return "In Progress";
    case 3:
      return "Resolved";
    case 4:
      return "Closed";
    default:
      return "Open";
  }
}

/** Prefer joined `clinics.acronym`; if blank, derive from `resolved_clinic_name`. */
function clinicAcronymSuffix(row: ContactTrackWithResolvedClinic): string {
  const fromDb = row.resolved_clinic_acronym?.replace(/\s+/g, "").toUpperCase() ?? "";
  if (fromDb) return fromDb;

  const name = row.resolved_clinic_name?.trim();
  if (!name) return "";
  const words = name.split(/\s+/).filter((w) => w.length > 0);
  let initials = "";
  for (const w of words) {
    const m = w.match(/[A-Za-z0-9]/);
    if (m) initials += m[0].toUpperCase();
  }
  if (initials.length >= 2) return initials.slice(0, 8);
  return name.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 4);
}

/** `{case_number}{clinic_acronym}` — e.g. `125GMS` (no separator). */
function formatCaseNumber(row: ContactTrackWithResolvedClinic): string {
  const raw = row.case_number;
  const num =
    raw != null && raw !== 0 && String(raw).trim() !== ""
      ? String(raw)
      : String(row.id);
  const ac = clinicAcronymSuffix(row);
  return ac ? `${num}${ac}` : num;
}

function mapRow(row: ContactTrackWithResolvedClinic): DashboardContactTrackRow {
  const clinicDisplay = row.resolved_clinic_name?.trim()
    ? row.resolved_clinic_name.trim()
    : toDisplayString(row.clinic);

  return {
    id: String(row.id),
    caseNumber: formatCaseNumber(row),
    type: row.type != null ? String(row.type) : "—",
    clinic: clinicDisplay,
    date: toDisplayString(row.date),
    reason: toDisplayString(row.reason),
    from: toDisplayString(row.name),
    dob: toDisplayString(row.dob),
    email: toDisplayString(row.email),
    cel: formatUsPhoneDisplay(row.cel),
    language: toDisplayString(row.lang),
    subject: toDisplayString(row.subject),
    message: toMessageString(row.message),
    assignedTo: toDisplayString(row.assign),
    bestTime: toDisplayString(row.besttime),
    priority: mapPriority(row.priority),
    status: mapStatus(row.status),
  };
}

export async function getDashboardContactTracks(): Promise<DashboardContactTrackRow[]> {
  const rows = await ContactTrackModel.getContactTracksForDashboard();
  return rows.map(mapRow);
}
