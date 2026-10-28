import "server-only";

import * as PayTypeModel from "@/models/settings/pay-type.model";

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  return String(v);
}

function statusFromDb(n: number | null | undefined): "Active" | "Inactive" {
  return (n ?? 0) === 1 ? "Active" : "Inactive";
}

export type PayTypeSettingsRow = {
  id: string;
  typeCode: string;
  typeName: string;
  description: string;
  status: "Active" | "Inactive";
};

export async function loadPayTypesPagePayload(): Promise<{ rows: PayTypeSettingsRow[] }> {
  const rows = await PayTypeModel.getAllPayTypes();
  return {
    rows: rows.map((row) => ({
      id: String(row.id),
      typeCode: toStr(row.type_code),
      typeName: toStr(row.type_name),
      description: toStr(row.description),
      status: statusFromDb(row.status),
    })),
  };
}
