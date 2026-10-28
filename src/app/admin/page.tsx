import { redirect } from "next/navigation";
import { ROUTES } from "@/routes/index";
import { getAuthSession } from "@/lib/auth-session";

/** `/admin` entry: unauthenticated users go to login; otherwise same hub as `/`. */
export default async function AdminEntryPage() {
  const session = await getAuthSession();
  if (!session) redirect(ROUTES.LOGIN);
  if (!session.securityVerified) redirect(ROUTES.SECURITY);
  redirect(ROUTES.DASHBOARD);
}
