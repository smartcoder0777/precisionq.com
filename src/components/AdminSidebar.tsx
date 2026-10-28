"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  HeartHandshake,
  UserRound,
  Building2,
  GraduationCap,
  Shield,
  Megaphone,
  ClipboardList,
  FileCheck,
  Package,
  CreditCard,
  Users,
  Activity,
} from "lucide-react";
import { adminPage } from "@/routes/index";

const NAV_ITEMS = [
  { title: "Dashboard", path: adminPage("/dashboard"), icon: LayoutDashboard },
  { title: "Tickets", path: adminPage("/tickets"), icon: Ticket },
  { title: "Community Services", path: adminPage("/community-services"), icon: HeartHandshake },
  { title: "Patient Services", path: adminPage("/patient-services"), icon: UserRound },
  { title: "Clinics", path: adminPage("/clinics"), icon: Building2 },
  { title: "Education", path: adminPage("/education"), icon: GraduationCap },
  { title: "Insurance", path: adminPage("/insurance"), icon: Shield },
  { title: "Announcement", path: adminPage("/announcement"), icon: Megaphone },
  { title: "Survey", path: adminPage("/survey"), icon: ClipboardList },
  { title: "Agreements", path: adminPage("/agreements"), icon: FileCheck },
  { title: "Products & Services", path: adminPage("/products-services"), icon: Package },
  { title: "Payments", path: adminPage("/payments"), icon: CreditCard },
  { title: "Users", path: adminPage("/users"), icon: Users },
];

function pathIsActive(pathname: string, itemPath: string): boolean {
  if (pathname === itemPath) return true;
  if (pathname.startsWith(`${itemPath}/`)) return true;
  return false;
}

export type AdminSidebarNavProps = {
  /** Call after navigation (e.g. close mobile sheet). */
  onNavigate?: () => void;
};

/** Shared nav links — desktop sidebar and mobile drawer. */
export function AdminSidebarNav({ onNavigate }: AdminSidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {NAV_ITEMS.map(item => {
        const isActive = pathIsActive(pathname, item.path);
        return (
          <Link
            key={item.path}
            href={item.path}
            onClick={() => onNavigate?.()}
            className={`sidebar-link ${isActive ? "sidebar-link-active" : "sidebar-link-inactive"}`}
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" />
            <span className="min-w-0 break-words">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBrand() {
  return (
    <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-5">
      <Activity className="h-7 w-7 shrink-0 text-sidebar-primary" />
      <span className="min-w-0 text-lg font-bold leading-tight text-sidebar-primary-foreground">
        Precision Quality
      </span>
    </div>
  );
}

/** Desktop sidebar only (lg+). Mobile nav uses `AdminSidebarNav` inside a sheet in `AdminLayout`. */
const AdminSidebar = () => {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <SidebarBrand />
      <AdminSidebarNav />
    </aside>
  );
};

export default AdminSidebar;
