import type { RowDataPacket } from "mysql2";
import { EVENT_STATUS_COLUMNS } from "@/db/schema/settings-ref";
import { insertRecord, selectAll, selectById } from "./_crud";

const TABLE_NAME = "event_status";
const COLUMNS = EVENT_STATUS_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id");

export type EventStatusRecord = RowDataPacket & {
  id: number;
  code: string | null;
  display: string | null;
  definition: string | null;
};

export type CreateEventStatusInput = Omit<EventStatusRecord, "id">;
export const getAllEventStatuses = () => selectAll<EventStatusRecord>(TABLE_NAME, COLUMNS);
export const getEventStatusById = (id: number) => selectById<EventStatusRecord>(TABLE_NAME, COLUMNS, id);
export const createEventStatus = (payload: CreateEventStatusInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);
