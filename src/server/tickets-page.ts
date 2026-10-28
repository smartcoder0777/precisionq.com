import "server-only";

import * as ClinicModel from "@/models/clinic.model";
import type { TicketsPagePayload, TicketsPageRow } from "@/types/tickets-page";
import type { TicketListRecord } from "@/models/ticket.model";
import * as TicketModel from "@/models/ticket.model";
import * as UserModel from "@/models/user.model";
import { formatUsDate } from "@/lib/date-format";

function toDisplayString(value: unknown, empty = "—"): string {
  if (value === null || value === undefined) return empty;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return empty;
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : empty;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return empty;
    return trimmed;
  }
  return String(value);
}

function toMessageString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) return value.toString("utf8");
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/** Value from `tickets.createdAt` (or legacy `created_at`) column. */
function ticketCreatedTimestamp(row: TicketListRecord): unknown {
  const r = row as Record<string, unknown>;
  return r.createdAt ?? r.created_at;
}

function parseCreatedAt(raw: unknown): Date | null {
  if (raw == null) return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  const t = Date.parse(String(raw));
  return Number.isNaN(t) ? null : new Date(t);
}

function formatCreatedAtDisplay(row: TicketListRecord): string {
  const d = parseCreatedAt(ticketCreatedTimestamp(row));
  const creator = row.creator_name?.trim() ?? "";
  const usDate = d ? formatUsDate(d, "—") : "";
  if (usDate && creator) return `${usDate} · ${creator}`;
  if (usDate) return usDate;
  if (creator) return creator;
  return "—";
}

/** Date-only (US format `MM/DD/YYYY`) from `tickets.createdAt` for the Created date column. */
function formatCreatedDateOnly(row: TicketListRecord): string {
  const d = parseCreatedAt(ticketCreatedTimestamp(row));
  if (!d) return "—";
  return formatUsDate(d, "—");
}

/** Adjust to match your `tickets.priority` codes. */
function mapPriority(value: number | null): TicketsPageRow["priority"] {
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

/** Adjust to match your `tickets.status` codes. */
function mapStatus(value: number | null): TicketsPageRow["status"] {
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

/** Adjust to match your `tickets.type` codes. */
function mapTicketType(value: number | null): string {
  if (value == null) return "—";
  const labels: Record<number, string> = {
    1: "General",
    2: "Billing",
    3: "Appointment",
    4: "Insurance",
    5: "Prescription",
    6: "Complaint",
    7: "Technical",
  };
  return labels[value] ?? `Type ${value}`;
}

function mapRow(row: TicketListRecord): TicketsPageRow {
  const clinic =
    row.clinic_name?.trim() ||
    (row.clinic_id != null ? `Clinic #${row.clinic_id}` : "—");
  const assignee = row.assignee_name?.trim() || "—";
  const backup = row.backup_name?.trim() || "—";
  const creator = row.creator_name?.trim() || "";

  return {
    id: String(row.id),
    no: String(row.id),
    clinic,
    clinicId: row.clinic_id,
    createdAt: formatCreatedAtDisplay(row),
    createdDate: formatCreatedDateOnly(row),
    creatorName: creator || "—",
    assignedTo: assignee,
    assignedToId: row.assigned_to,
    backupAssigned: backup,
    backupAssignedId: row.backup_assigned,
    reason: toDisplayString(row.reason),
    type: mapTicketType(row.type),
    typeCode: row.type,
    message: toMessageString(row.message),
    priority: mapPriority(row.priority),
    status: mapStatus(row.status),
  };
}

export async function getTicketsPagePayload(): Promise<TicketsPagePayload> {
  const [rows, clinicRows, users] = await Promise.all([
    TicketModel.getTicketsForListView(),
    ClinicModel.getAllClinics(),
    UserModel.listUsersForTicketSelect(),
  ]);

  const clinics = clinicRows.map((c) => ({
    id: c.id,
    name: c.name?.trim() || `Clinic #${c.id}`,
  }));

  return {
    tickets: rows.map(mapRow),
    clinics,
    users,
  };
}
