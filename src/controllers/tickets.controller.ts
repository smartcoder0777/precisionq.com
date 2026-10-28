/**
 * Tickets CRUD for admin API routes.
 */
import { getAuthSession, touchAuthSession } from "@/lib/auth-session";
import * as TicketModel from "@/models/ticket.model";
import * as UserModel from "@/models/user.model";
import type { HttpResult } from "./health.controller";
import { requireRolePermission } from "./_permission";

export type TicketWriteBody = {
  clinicId?: unknown;
  type?: unknown;
  reason?: unknown;
  message?: unknown;
  assignedToId?: unknown;
  backupAssignedId?: unknown;
  priority?: unknown;
  status?: unknown;
};

function numOrNull(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export function priorityToDb(p: string): number {
  switch (p) {
    case "High":
      return 1;
    case "Medium":
      return 2;
    case "Low":
      return 3;
    default:
      return 3;
  }
}

export function statusToDb(s: string): number {
  switch (s) {
    case "Open":
      return 1;
    case "In Progress":
      return 2;
    case "Resolved":
      return 3;
    case "Closed":
      return 4;
    default:
      return 1;
  }
}

async function unauthorized(): Promise<HttpResult<{ ok: false; message: string }>> {
  return { status: 401, body: { ok: false, message: "Unauthorized." } };
}

async function requireSession() {
  const session = await getAuthSession();
  if (!session) return null;
  await touchAuthSession(session);
  return session;
}

export const ticketsController = {
  async listAssignees(): Promise<
    HttpResult<{ ok: boolean; users?: UserModel.UserTicketSelectOption[]; message?: string }>
  > {
    const session = await requireSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "tickets", "view");
    if (denied) return denied;

    const users = await UserModel.listUsersForTicketSelect();
    return { status: 200, body: { ok: true, users } };
  },

  async create(input: TicketWriteBody): Promise<HttpResult<{ ok: boolean; id?: number; message?: string }>> {
    const session = await requireSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "tickets", "create");
    if (denied) return denied;

    const reason = strOrNull(input.reason);
    if (!reason) {
      return { status: 400, body: { ok: false, message: "Reason is required." } };
    }

    const type = numOrNull(input.type);
    const clinicId = numOrNull(input.clinicId);

    try {
      const id = await TicketModel.insertTicketRow({
        user_id: session.userId,
        clinic_id: clinicId,
        type,
        reason,
        message: strOrNull(input.message),
        assigned_to: numOrNull(input.assignedToId),
        backup_assigned: numOrNull(input.backupAssignedId),
        priority: priorityToDb(String(input.priority ?? "Medium")),
        status: statusToDb(String(input.status ?? "Open")),
      });
      return { status: 201, body: { ok: true, id } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Create failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async update(
    id: number,
    input: TicketWriteBody,
  ): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await requireSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "tickets", "edit");
    if (denied) return denied;

    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid ticket id." } };
    }

    const patch: TicketModel.TicketUpdatePatch = {};
    if (input.clinicId !== undefined) patch.clinic_id = numOrNull(input.clinicId);
    if (input.type !== undefined) patch.type = numOrNull(input.type);
    if (input.reason !== undefined) patch.reason = strOrNull(input.reason);
    if (input.message !== undefined) patch.message = strOrNull(input.message);
    if (input.assignedToId !== undefined) patch.assigned_to = numOrNull(input.assignedToId);
    if (input.backupAssignedId !== undefined) patch.backup_assigned = numOrNull(input.backupAssignedId);
    if (input.priority !== undefined) patch.priority = priorityToDb(String(input.priority));
    if (input.status !== undefined) patch.status = statusToDb(String(input.status));

    try {
      const existing = await TicketModel.getTicketById(id);
      if (!existing) {
        return { status: 404, body: { ok: false, message: "Ticket not found." } };
      }
      await TicketModel.updateTicketById(id, patch);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Update failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async remove(id: number): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await requireSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "tickets", "delete");
    if (denied) return denied;

    if (!Number.isFinite(id) || id <= 0) {
      return { status: 400, body: { ok: false, message: "Invalid ticket id." } };
    }

    try {
      await TicketModel.deleteTicketById(id);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },
};
