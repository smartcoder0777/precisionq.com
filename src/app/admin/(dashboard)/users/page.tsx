import Users from "@/views/Users";
import { loadUsersPagePayload } from "@/server/users-page";

export default async function Page() {
  const payload = await loadUsersPagePayload();
  return <Users {...payload} />;
}
