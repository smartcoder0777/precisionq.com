import "server-only";

import * as BillingCycleCategoryModel from "@/models/settings/billing-cycle-category.model";
import * as PaymentCycleModel from "@/models/settings/payment-cycle.model";

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  return String(v);
}

function statusFromDb(n: number | null | undefined): "Active" | "Inactive" {
  return (n ?? 0) === 1 ? "Active" : "Inactive";
}

export type PaymentCycleSettingsRow = {
  id: string;
  categoryId: string;
  cycleCode: string;
  cycleName: string;
  intervalValue: number;
  intervalUnit: string;
  isRecurring: boolean;
  description: string;
  status: "Active" | "Inactive";
};

export type PaymentCycleCategoryOption = {
  id: string;
  label: string;
};

export async function loadPaymentCyclesPagePayload(): Promise<{
  rows: PaymentCycleSettingsRow[];
  categoryOptions: PaymentCycleCategoryOption[];
}> {
  const [rows, categories] = await Promise.all([
    PaymentCycleModel.getAllPaymentCycles(),
    BillingCycleCategoryModel.getAllBillingCycleCategories(),
  ]);
  return {
    rows: rows.map((row) => ({
      id: String(row.id),
      categoryId: row.category_id == null ? "" : String(row.category_id),
      cycleCode: toStr(row.cycle_code),
      cycleName: toStr(row.cycle_name),
      intervalValue: Number(row.interval_value ?? 0),
      intervalUnit: toStr(row.interval_unit),
      isRecurring: Number(row.is_recurring ?? 0) === 1,
      description: toStr(row.description),
      status: statusFromDb(row.status),
    })),
    categoryOptions: categories.map((c) => ({
      id: String(c.id),
      label: toStr(c.category_name) || toStr(c.category_code) || `Category #${c.id}`,
    })),
  };
}
