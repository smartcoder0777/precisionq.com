import "server-only";

import { getAuthSession } from "@/lib/auth-session";
import { canViewAllTickets } from "@/lib/ticket-access";
import { ensureMarketplacePaymentTables } from "@/lib/payments/ensure-tables";
import { paymentsRecordToPageRow } from "@/lib/payments-db-mapper";
import * as PaymentsModel from "@/models/payments.model";
import type { PaymentsPagePayload } from "@/types/payments-page";

export async function loadPaymentsPagePayload(): Promise<PaymentsPagePayload> {
  await ensureMarketplacePaymentTables();
  const rows = await PaymentsModel.getAllPayments();
  const session = await getAuthSession();
  const canDeleteAll = session ? await canViewAllTickets(session) : false;
  return { rows: rows.map(paymentsRecordToPageRow), canDeleteAll };
}
