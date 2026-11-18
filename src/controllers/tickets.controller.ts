/**
 * Tickets CRUD for admin API routes.
 */
import { getAuthSession, touchAuthSession } from "@/lib/auth-session";
import { canViewAllTickets, listTicketAdminRecipients, ticketVisibleToUser } from "@/lib/ticket-access";
import { notifyTicketCreated, notifyTicketUpdated, sendTicketStatusReport } from "@/lib/ticket-email";
import * as TicketModel from "@/models/ticket.model";
import * as TicketTypeModel from "@/models/settings/ticket-type.model";
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

function statusLabel(value: number | null | undefined): string {
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

function priorityLabel(value: number | null | undefined): string {
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

async function unauthorized(): Promise<HttpResult<{ ok: false; message: string }>> {
  return { status: 401, body: { ok: false, message: "Unauthorized." } };
}

async function forbidden(message = "You don't have access to this ticket."): Promise<
  HttpResult<{ ok: false; message: string }>
> {
  return { status: 403, body: { ok: false, message } };
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
    const viewAll = await canViewAllTickets(session);
    return {
      status: 200,
      body: {
        ok: true,
        users: viewAll ? users : users.filter((u) => u.id === session.userId),
      },
    };
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
    const viewAll = await canViewAllTickets(session);
    let assignedTo = numOrNull(input.assignedToId);
    let backupAssigned = numOrNull(input.backupAssignedId);
    if (!viewAll) {
      assignedTo = session.userId;
      backupAssigned = backupAssigned === session.userId ? null : backupAssigned;
    }

    try {
      const id = await TicketModel.insertTicketRow({
        user_id: session.userId,
        clinic_id: clinicId,
        type,
        reason,
        message: strOrNull(input.message),
        assigned_to: assignedTo,
        backup_assigned: backupAssigned,
        priority: priorityToDb(String(input.priority ?? "Medium")),
        status: statusToDb(String(input.status ?? "Open")),
      });
      const created = await TicketModel.getTicketById(id);
      if (created) {
        void notifyTicketCreated(created).catch((err) => {
          console.error("[ticketsController.create] email failed", err);
        });
      }
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

    try {
      const existing = await TicketModel.getTicketById(id);
      if (!existing) {
        return { status: 404, body: { ok: false, message: "Ticket not found." } };
      }

      const viewAll = await canViewAllTickets(session);
      if (!viewAll && !ticketVisibleToUser(existing, session.userId)) {
        return forbidden();
      }

      const patch: TicketModel.TicketUpdatePatch = {};
      if (input.clinicId !== undefined) patch.clinic_id = numOrNull(input.clinicId);
      if (input.type !== undefined) patch.type = numOrNull(input.type);
      if (input.reason !== undefined) patch.reason = strOrNull(input.reason);
      if (input.message !== undefined) patch.message = strOrNull(input.message);
      if (input.priority !== undefined) patch.priority = priorityToDb(String(input.priority));
      if (input.status !== undefined) patch.status = statusToDb(String(input.status));

      if (viewAll) {
        if (input.assignedToId !== undefined) patch.assigned_to = numOrNull(input.assignedToId);
        if (input.backupAssignedId !== undefined) patch.backup_assigned = numOrNull(input.backupAssignedId);
      }

      await TicketModel.updateTicketById(id, patch);
      const updated = await TicketModel.getTicketById(id);
      if (updated) {
        void notifyTicketUpdated(existing, updated).catch((err) => {
          console.error("[ticketsController.update] email failed", err);
        });
      }
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
      const existing = await TicketModel.getTicketById(id);
      if (!existing) {
        return { status: 404, body: { ok: false, message: "Ticket not found." } };
      }
      const viewAll = await canViewAllTickets(session);
      if (!viewAll && !ticketVisibleToUser(existing, session.userId)) {
        return forbidden();
      }
      await TicketModel.deleteTicketById(id);
      return { status: 200, body: { ok: true } };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed.";
      return { status: 500, body: { ok: false, message } };
    }
  },

  async sendStatusReport(input: {
    userId?: unknown;
  }): Promise<HttpResult<{ ok: boolean; message?: string }>> {
    const session = await requireSession();
    if (!session) return unauthorized();
    const denied = await requireRolePermission(session, "tickets", "view");
    if (denied) return denied;

    const viewAll = await canViewAllTickets(session);
    const requestedId = numOrNull(input.userId);
    const targetUserId = viewAll ? requestedId ?? session.userId : session.userId;
    if (!targetUserId) {
      return { status: 400, body: { ok: false, message: "Select a user to email the report." } };
    }

    const user = await UserModel.getUserById(targetUserId);
    if (!user?.email?.trim()) {
      return { status: 400, body: { ok: false, message: "That user does not have an email address." } };
    }

    const [rows, typeRows, admins] = await Promise.all([
      TicketModel.getTicketsForListView({ assignedUserId: targetUserId }),
      TicketTypeModel.getActiveTicketTypes(),
      listTicketAdminRecipients(),
    ]);

    const typeLabels = new Map<number, string>();
    for (const t of typeRows) {
      typeLabels.set(t.id, t.name?.trim() || `Type ${t.id}`);
    }

    const firstName = (user.fname ?? "").trim() || "User";
    const recipientName = [user.fname, user.lname].filter(Boolean).join(" ").trim() || user.email;
    const adminEmails = admins.map((a) => a.email).filter((email) => email.toLowerCase() !== user.email.trim().toLowerCase());

    const result = await sendTicketStatusReport({
      subjectFirstName: firstName,
      recipientEmail: user.email.trim(),
      recipientName,
      adminEmails,
      tickets: rows.map((row) => ({
        id: row.id,
        clinic: row.clinic_name?.trim() || (row.clinic_id != null ? `Clinic #${row.clinic_id}` : "—"),
        reason: row.reason?.trim() || "—",
        type: row.type != null ? typeLabels.get(row.type) ?? `Type ${row.type}` : "—",
        priority: priorityLabel(row.priority),
        status: statusLabel(row.status),
        assignedTo: row.assignee_name?.trim() || "—",
      })),
    });

    if (!result.ok) {
      return { status: 500, body: { ok: false, message: result.message } };
    }
    return { status: 200, body: { ok: true, message: "Status report emailed." } };
  },
};
