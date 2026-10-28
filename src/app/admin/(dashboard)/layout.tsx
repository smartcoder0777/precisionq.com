import AdminLayout from "@/components/AdminLayout";
import { redirect } from "next/navigation";
import { ROUTES } from "@/routes/index";
import { getAuthSession } from "@/lib/auth-session";
import { headers } from "next/headers";
import { resolvePagePermissionKey } from "@/lib/role-permissions";
import { requireRolePermission } from "@/controllers/_permission";

export default async function DashboardSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  if (!session) redirect(ROUTES.LOGIN);
  if (!session.securityVerified) redirect(ROUTES.SECURITY);
  const pathname = (await headers()).get("x-admin-pathname") ?? "";
  const pageKey = resolvePagePermissionKey(pathname);
  if (pageKey) {
    const denied = await requireRolePermission(session, pageKey, "view");
    if (denied) redirect(ROUTES.FORBIDDEN);
  }
  return <AdminLayout>{children}</AdminLayout>;
}
