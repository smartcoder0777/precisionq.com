import "server-only";

import * as TicketTypeModel from "@/models/settings/ticket-type.model";

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  return String(v);
}

function statusFromDb(n: number | null | undefined): "Active" | "Inactive" {
  return (n ?? 0) === 1 ? "Active" : "Inactive";
}

export type TicketTypeSettingsRow = {
  id: string;
  name: string;
  description: string;
  sortOrder: string;
  status: "Active" | "Inactive";
};

export async function loadTicketTypesPagePayload(): Promise<{ rows: TicketTypeSettingsRow[] }> {
  const rows = await TicketTypeModel.getAllTicketTypes();
  return {
    rows: rows
      .slice()
      .sort((a, b) => {
        const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
        if (so !== 0) return so;
        return (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" });
      })
      .map((row) => ({
        id: String(row.id),
        name: toStr(row.name),
        description: toStr(row.description),
        sortOrder: toStr(row.sort_order ?? 0),
        status: statusFromDb(row.status),
      })),
  };
}
