import "server-only";

import { paymentsRecordToPageRow } from "@/lib/payments-db-mapper";
import * as PaymentsModel from "@/models/payments.model";
import type { PaymentsPagePayload } from "@/types/payments-page";

export async function loadPaymentsPagePayload(): Promise<PaymentsPagePayload> {
  const rows = await PaymentsModel.getAllPayments();
  return { rows: rows.map(paymentsRecordToPageRow) };
}
