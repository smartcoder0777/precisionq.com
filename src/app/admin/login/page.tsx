import { redirect } from "next/navigation";
import Login from "@/views/Login";
import { ROUTES } from "@/routes/index";
import { getAuthSession } from "@/lib/auth-session";

type PageProps = {
  searchParams: Promise<{ security_failed?: string | string[]; reason?: string | string[] }>;
};

export default async function Page({ searchParams }: PageProps) {
  const session = await getAuthSession();
  if (session?.securityVerified) redirect(ROUTES.DASHBOARD);
  if (session && !session.securityVerified) redirect(ROUTES.SECURITY);
  const sp = await searchParams;
  const raw = sp.security_failed;
  const flag = Array.isArray(raw) ? raw[0] : raw;
  const securityAnswerFailed = flag === "1" || flag === "true";
  const reasonRaw = sp.reason;
  const reason = Array.isArray(reasonRaw) ? reasonRaw[0] : reasonRaw;
  const sessionExpired = reason === "session-expired";
  return <Login securityAnswerFailed={securityAnswerFailed} sessionExpired={sessionExpired} />;
}
