import { redirect } from "next/navigation";
import { ROUTES } from "@/routes";
import MyProfile from "@/views/MyProfile";
import { loadProfilePagePayload } from "@/server/profile-page";

export default async function Page() {
  const payload = await loadProfilePagePayload();
  if (!payload) redirect(ROUTES.LOGIN);
  return <MyProfile initialProfile={payload} />;
}
