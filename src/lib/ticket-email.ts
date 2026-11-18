import "server-only";

import { sendSurveyEmail, isSmtpConfigured } from "@/lib/survey-delivery";
import * as ClinicModel from "@/models/clinic.model";
import * as TicketTypeModel from "@/models/settings/ticket-type.model";
import * as UserModel from "@/models/user.model";
import type { TicketRecord } from "@/models/ticket.model";

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
      return "—";
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
      return "—";
  }
}

function appBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.HOST_URL?.trim() ||
    process.env.HOST?.trim() ||
    "";
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
}

function ticketUrl(ticketId: number): string {
  const base = appBaseUrl();
  return base ? `${base}/admin/tickets` : "/admin/tickets";
}

function userDisplayName(user: UserModel.UserDbRecord | null): string {
  if (!user) return "there";
  const name = [user.fname, user.lname].filter(Boolean).join(" ").trim();
  return name || user.email || "there";
}

async function resolveTypeLabel(typeCode: number | null | undefined): Promise<string> {
  if (typeCode == null) return "—";
  try {
    await TicketTypeModel.ensureTicketTypesReady();
    const rows = await TicketTypeModel.getAllTicketTypes();
    const match = rows.find((r) => r.id === typeCode);
    if (match?.name?.trim()) return match.name.trim();
  } catch {
    /* fall through */
  }
  return `Type ${typeCode}`;
}

async function resolveClinicName(clinicId: number | null | undefined): Promise<string> {
  if (clinicId == null) return "—";
  const clinic = await ClinicModel.getClinicById(clinicId);
  return clinic?.name?.trim() || `Clinic #${clinicId}`;
}

function buildTicketEmailHtml(input: {
  heading: string;
  intro: string;
  recipientName: string;
  ticketId: number;
  clinic: string;
  type: string;
  reason: string;
  message: string;
  priority: string;
  status: string;
  assignedTo: string;
  backupAssigned: string;
  changeSummary?: string;
}): { subject: string; html: string; text: string } {
  const subject = input.heading.includes("Updated")
    ? `Ticket #${input.ticketId} updated — ${input.status}`
    : `Ticket #${input.ticketId} assigned to you`;

  const rows: [string, string][] = [
    ["Ticket", `#${input.ticketId}`],
    ["Clinic", input.clinic],
    ["Type", input.type],
    ["Priority", input.priority],
    ["Status", input.status],
    ["Assigned to", input.assignedTo],
    ["Backup assignee", input.backupAssigned],
    ["Reason", input.reason || "—"],
  ];

  const detailRows = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:10px 0; border-bottom:1px solid #e2e8f0; width:140px; color:#64748b; font-size:13px; font-weight:600;">${esc(label)}</td>
        <td style="padding:10px 0; border-bottom:1px solid #e2e8f0; color:#0f172a; font-size:14px;">${esc(value)}</td>
      </tr>`,
    )
    .join("");

  const messageBlock = input.message
    ? `<div style="margin-top:18px; padding:14px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px;">
        <div style="font-size:12px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; color:#64748b; margin-bottom:6px;">Message</div>
        <div style="font-size:14px; color:#0f172a; white-space:pre-wrap; line-height:1.5;">${esc(input.message)}</div>
      </div>`
    : "";

  const changeBlock = input.changeSummary
    ? `<div style="margin:16px 0 0; padding:12px 14px; background:#ecfeff; border:1px solid #a5f3fc; border-radius:10px; color:#155e75; font-size:14px;">
        ${esc(input.changeSummary)}
      </div>`
    : "";

  const link = ticketUrl(input.ticketId);

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0; padding:0; background:#f1f5f9; font-family:Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;">
          <tr>
            <td style="background:#0f766e; padding:22px 28px;">
              <div style="color:#ecfdf5; font-size:13px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">PrecisionQ</div>
              <div style="color:#ffffff; font-size:22px; font-weight:700; margin-top:6px;">${esc(input.heading)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 12px; font-size:15px; color:#0f172a;">Hi ${esc(input.recipientName)},</p>
              <p style="margin:0 0 18px; font-size:15px; color:#334155; line-height:1.5;">${esc(input.intro)}</p>
              ${changeBlock}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                ${detailRows}
              </table>
              ${messageBlock}
              <div style="margin-top:24px;">
                <a href="${esc(link)}" style="display:inline-block; background:#0f766e; color:#ffffff; text-decoration:none; font-weight:700; font-size:14px; padding:12px 18px; border-radius:10px;">Open tickets</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 22px; background:#f8fafc; color:#64748b; font-size:12px; border-top:1px solid #e2e8f0;">
              This notification was sent by PrecisionQ tickets.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    input.heading,
    "",
    `Hi ${input.recipientName},`,
    input.intro,
    input.changeSummary || "",
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    input.message ? `\nMessage:\n${input.message}` : "",
    "",
    `Open: ${link}`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return { subject, html, text };
}

async function recipientEmails(userIds: Array<number | null | undefined>): Promise<
  { id: number; email: string; name: string }[]
> {
  const unique = [...new Set(userIds.filter((id): id is number => id != null && Number.isFinite(id) && id > 0))];
  const out: { id: number; email: string; name: string }[] = [];
  for (const id of unique) {
    const user = await UserModel.getUserById(id);
    const email = user?.email?.trim();
    if (!email) continue;
    out.push({ id, email, name: userDisplayName(user) });
  }
  return out;
}

async function ticketContext(ticket: TicketRecord) {
  const [clinic, type, assignee, backup] = await Promise.all([
    resolveClinicName(ticket.clinic_id),
    resolveTypeLabel(ticket.type),
    ticket.assigned_to ? UserModel.getUserById(ticket.assigned_to) : Promise.resolve(null),
    ticket.backup_assigned ? UserModel.getUserById(ticket.backup_assigned) : Promise.resolve(null),
  ]);
  return {
    clinic,
    type,
    assignedTo: userDisplayName(assignee),
    backupAssigned: ticket.backup_assigned ? userDisplayName(backup) : "None",
    priority: priorityLabel(ticket.priority),
    status: statusLabel(ticket.status),
    reason: ticket.reason?.trim() || "",
    message: ticket.message?.trim() || "",
  };
}

/** Email primary assignee (and backup if set) when a ticket is created. */
export async function notifyTicketCreated(ticket: TicketRecord): Promise<void> {
  if (!isSmtpConfigured()) return;
  if (!ticket.assigned_to) return;

  const ctx = await ticketContext(ticket);
  const recipients = await recipientEmails([ticket.assigned_to, ticket.backup_assigned]);
  if (recipients.length === 0) return;

  for (const recipient of recipients) {
    const isPrimary = recipient.id === ticket.assigned_to;
    const payload = buildTicketEmailHtml({
      heading: "New ticket assigned",
      intro: isPrimary
        ? "A new ticket has been assigned to you. Please review the details below."
        : "You were added as the backup assignee on a new ticket. Please review the details below.",
      recipientName: recipient.name,
      ticketId: ticket.id,
      clinic: ctx.clinic,
      type: ctx.type,
      reason: ctx.reason,
      message: ctx.message,
      priority: ctx.priority,
      status: ctx.status,
      assignedTo: ctx.assignedTo,
      backupAssigned: ctx.backupAssigned,
    });
    const result = await sendSurveyEmail({
      to: recipient.email,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    if (!result.ok) {
      console.error("[notifyTicketCreated]", recipient.email, result.message);
    }
  }
}

/** Email assignees when a ticket is updated (status/assignment/content). */
export async function notifyTicketUpdated(
  before: TicketRecord,
  after: TicketRecord,
): Promise<void> {
  if (!isSmtpConfigured()) return;

  const changes: string[] = [];
  if (before.status !== after.status) {
    changes.push(`Status: ${statusLabel(before.status)} → ${statusLabel(after.status)}`);
  }
  if (before.priority !== after.priority) {
    changes.push(`Priority: ${priorityLabel(before.priority)} → ${priorityLabel(after.priority)}`);
  }
  if (before.assigned_to !== after.assigned_to) {
    changes.push("Primary assignee changed");
  }
  if (before.backup_assigned !== after.backup_assigned) {
    changes.push("Backup assignee changed");
  }
  if ((before.reason ?? "") !== (after.reason ?? "")) changes.push("Reason updated");
  if ((before.message ?? "") !== (after.message ?? "")) changes.push("Message updated");
  if (before.type !== after.type) changes.push("Type updated");
  if (before.clinic_id !== after.clinic_id) changes.push("Clinic updated");

  if (changes.length === 0) return;

  const recipients = await recipientEmails([
    after.assigned_to,
    after.backup_assigned,
    before.assigned_to,
    before.backup_assigned,
  ]);
  if (recipients.length === 0) return;

  const ctx = await ticketContext(after);
  const changeSummary = changes.join("; ");
  const closedOrStatus = before.status !== after.status;

  for (const recipient of recipients) {
    const payload = buildTicketEmailHtml({
      heading: closedOrStatus ? "Ticket status updated" : "Ticket updated",
      intro: "A ticket you are assigned to was updated. See the summary below.",
      recipientName: recipient.name,
      ticketId: after.id,
      clinic: ctx.clinic,
      type: ctx.type,
      reason: ctx.reason,
      message: ctx.message,
      priority: ctx.priority,
      status: ctx.status,
      assignedTo: ctx.assignedTo,
      backupAssigned: ctx.backupAssigned,
      changeSummary,
    });
    const result = await sendSurveyEmail({
      to: recipient.email,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    if (!result.ok) {
      console.error("[notifyTicketUpdated]", recipient.email, result.message);
    }
  }
}

export type TicketStatusReportRow = {
  id: number;
  clinic: string;
  reason: string;
  type: string;
  priority: string;
  status: string;
  assignedTo: string;
};

function formatReportSubjectDate(d = new Date()): string {
  const raw = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return raw.replace(",", "");
}

/**
 * Progress report for a user's assigned tickets.
 * Subject: `{FirstName} - Quality Assignment Status Report — {Mon D YYYY}`
 * Sent to the user and site admins / managers / super admins.
 */
export async function sendTicketStatusReport(input: {
  subjectFirstName: string;
  recipientEmail: string;
  recipientName: string;
  adminEmails: string[];
  tickets: TicketStatusReportRow[];
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSmtpConfigured()) {
    return { ok: false, message: "Email is not configured (MAIL_* / SMTP_*)." };
  }

  const firstName = input.subjectFirstName.trim() || "User";
  const dateLabel = formatReportSubjectDate();
  const subject = `${firstName} - Quality Assignment Status Report — ${dateLabel}`;

  const open = input.tickets.filter((t) => t.status === "Open").length;
  const inProgress = input.tickets.filter((t) => t.status === "In Progress").length;
  const resolved = input.tickets.filter((t) => t.status === "Resolved").length;
  const closed = input.tickets.filter((t) => t.status === "Closed").length;

  const tableRows =
    input.tickets.length === 0
      ? `<tr><td colspan="6" style="padding:12px; color:#64748b;">No assigned tickets.</td></tr>`
      : input.tickets
          .map(
            (t) => `<tr>
              <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0; font-size:13px;">#${esc(t.id)}</td>
              <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0; font-size:13px;">${esc(t.clinic)}</td>
              <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0; font-size:13px;">${esc(t.reason)}</td>
              <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0; font-size:13px;">${esc(t.type)}</td>
              <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0; font-size:13px;">${esc(t.priority)}</td>
              <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0; font-size:13px;">${esc(t.status)}</td>
            </tr>`,
          )
          .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="width:100%;max-width:680px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#0f766e;padding:22px 28px;">
          <div style="color:#ecfdf5;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">PrecisionQ</div>
          <div style="color:#fff;font-size:20px;font-weight:700;margin-top:6px;">Quality Assignment Status Report</div>
          <div style="color:#ccfbf1;font-size:13px;margin-top:6px;">${esc(firstName)} · ${esc(dateLabel)}</div>
        </td></tr>
        <tr><td style="padding:24px 28px;">
          <p style="margin:0 0 14px;font-size:15px;color:#0f172a;">Hi ${esc(input.recipientName)},</p>
          <p style="margin:0 0 18px;font-size:14px;color:#334155;line-height:1.5;">Here is the current progress report for assigned tickets.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
            <tr>
              <td style="padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;text-align:center;width:25%;"><div style="font-size:11px;color:#64748b;font-weight:700;">TOTAL</div><div style="font-size:20px;font-weight:700;color:#0f172a;">${input.tickets.length}</div></td>
              <td style="width:8px;"></td>
              <td style="padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;text-align:center;width:25%;"><div style="font-size:11px;color:#64748b;font-weight:700;">OPEN</div><div style="font-size:20px;font-weight:700;color:#0f172a;">${open}</div></td>
              <td style="width:8px;"></td>
              <td style="padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;text-align:center;width:25%;"><div style="font-size:11px;color:#64748b;font-weight:700;">IN PROGRESS</div><div style="font-size:20px;font-weight:700;color:#0f172a;">${inProgress}</div></td>
              <td style="width:8px;"></td>
              <td style="padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;text-align:center;width:25%;"><div style="font-size:11px;color:#64748b;font-weight:700;">RESOLVED / CLOSED</div><div style="font-size:20px;font-weight:700;color:#0f172a;">${resolved + closed}</div></td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
            <tr style="background:#f1f5f9;">
              <th align="left" style="padding:8px 10px;font-size:11px;color:#64748b;">No</th>
              <th align="left" style="padding:8px 10px;font-size:11px;color:#64748b;">Clinic</th>
              <th align="left" style="padding:8px 10px;font-size:11px;color:#64748b;">Reason</th>
              <th align="left" style="padding:8px 10px;font-size:11px;color:#64748b;">Type</th>
              <th align="left" style="padding:8px 10px;font-size:11px;color:#64748b;">Priority</th>
              <th align="left" style="padding:8px 10px;font-size:11px;color:#64748b;">Status</th>
            </tr>
            ${tableRows}
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    subject,
    "",
    `Hi ${input.recipientName},`,
    "Here is the current progress report for assigned tickets.",
    "",
    `Total: ${input.tickets.length}`,
    `Open: ${open}`,
    `In Progress: ${inProgress}`,
    `Resolved: ${resolved}`,
    `Closed: ${closed}`,
    "",
    ...input.tickets.map(
      (t) => `#${t.id} | ${t.clinic} | ${t.reason} | ${t.type} | ${t.priority} | ${t.status}`,
    ),
  ].join("\n");

  const toList = [input.recipientEmail, ...input.adminEmails]
    .map((e) => e.trim())
    .filter(Boolean);
  const uniqueTo = [...new Set(toList)];

  return sendSurveyEmail({
    to: uniqueTo.join(","),
    subject,
    html,
    text,
  });
}
