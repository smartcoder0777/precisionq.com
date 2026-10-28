import RolesPermissions from "@/views/RolesPermissions";
import { loadRolesPermissionsPagePayload } from "@/server/roles-permissions-page";

export default async function Page() {
  const payload = await loadRolesPermissionsPagePayload();
  return <RolesPermissions initialRows={payload.rows} />;
}
