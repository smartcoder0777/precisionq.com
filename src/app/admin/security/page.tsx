import { redirect } from "next/navigation";
import SecurityQuestion from "@/views/SecurityQuestion";
import { ROUTES } from "@/routes/index";
import { getAuthSession } from "@/lib/auth-session";

export default async function Page() {
  const session = await getAuthSession();
  if (!session) redirect(ROUTES.LOGIN);
  if (session.securityVerified) redirect(ROUTES.DASHBOARD);
  return <SecurityQuestion />;
}
