import type { RowDataPacket } from "mysql2";
import { PERMISSIONS_COLUMNS } from "@/db/schema/users-roles";
import { insertRecord, selectAll, selectById } from "../_crud";

const TABLE_NAME = "permissions";
const COLUMNS = PERMISSIONS_COLUMNS as unknown as readonly string[];
const INSERT_COLUMNS = COLUMNS.filter((c) => c !== "id");

export type PermissionRecord = RowDataPacket & {
  id: number; name: string | null; description: string | null;
};
export type CreatePermissionInput = Omit<PermissionRecord, "id">;
export const getAllPermissions = () => selectAll<PermissionRecord>(TABLE_NAME, COLUMNS);
export const getPermissionById = (id: number) => selectById<PermissionRecord>(TABLE_NAME, COLUMNS, id);
export const createPermission = (payload: CreatePermissionInput) =>
  insertRecord(TABLE_NAME, INSERT_COLUMNS, payload);
