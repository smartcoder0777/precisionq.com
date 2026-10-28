import type { RowDataPacket } from "mysql2";
import { INVOICES_COLUMNS } from "@/db/schema/education-products";
import { insertRecord, selectAll, selectById } from "./_crud";

const TABLE_NAME = "invoices";
const COLUMNS = INVOICES_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((column) => column !== "id");

export type InvoicesRecord = RowDataPacket & {
  id: number; stripe_invoice_id: string | null; stripe_payment_intent_id: string | null; stripe_payment_method_id: string | null;
  order_id: number | null; user_id: number | null; amount: number | null; customer_email: string | null;
  card_last4: string | null; currency: string | null; status: string | null; invoice_pdf: string | null;
};

export type CreateInvoicesInput = Omit<InvoicesRecord, "id">;
export const getAllInvoices = () => selectAll<InvoicesRecord>(TABLE_NAME, COLUMNS);
export const getInvoicesById = (id: number) => selectById<InvoicesRecord>(TABLE_NAME, COLUMNS, id);
export const createInvoices = (payload: CreateInvoicesInput) => insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);
