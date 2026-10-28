/** Ticket row for the Tickets admin list (mapped from `tickets` + joins). */
export type TicketsPageRow = {
  id: string;
  /** Display number (same as DB `id`, no prefix). */
  no: string;
  clinic: string;
  clinicId: number | null;
  /** Datetime from `tickets.created_at` + creator from `users` (`user_id`). */
  createdAt: string;
  /** Date-only portion of `created_at` (YYYY-MM-DD). */
  createdDate: string;
  creatorName: string;
  assignedTo: string;
  assignedToId: number | null;
  backupAssigned: string;
  backupAssignedId: number | null;
  reason: string;
  type: string;
  typeCode: number | null;
  message: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Resolved" | "Closed";
};

export type ClinicSelectOption = { id: number; name: string };
export type UserSelectOption = { id: number; label: string };

export type TicketsPagePayload = {
  tickets: TicketsPageRow[];
  clinics: ClinicSelectOption[];
  users: UserSelectOption[];
};
