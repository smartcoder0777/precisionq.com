"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AdminSidebar, { AdminSidebarNav } from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { API_ROUTES, ROUTES } from "@/routes/index";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import LottieLoader from "@/components/LottieLoader";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isSecurityVerified, authLoading } = useAuth();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) router.replace(ROUTES.LOGIN);
    else if (!isSecurityVerified) router.replace(ROUTES.SECURITY);
  }, [authLoading, isAuthenticated, isSecurityVerified, router]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !isSecurityVerified) return;
    const run = async () => {
      try {
        const res = await fetch(API_ROUTES.SETTINGS_GENERAL_PUBLIC, { cache: "no-store" });
        const data = (await res.json()) as {
          ok?: boolean;
          settings?: { themeMode?: string; sidebarColor?: string };
        };
        if (!res.ok || !data.ok || !data.settings) return;
        const root = document.documentElement;
        const storedOverride = window.localStorage.getItem("care_hub_theme_mode_override");
        const themeMode = storedOverride === "dark" || storedOverride === "light"
          ? storedOverride
          : data.settings.themeMode === "dark"
            ? "dark"
            : "light";
        root.classList.toggle("dark", themeMode === "dark");
        const sidebarColor = String(data.settings.sidebarColor ?? "blue");
        root.setAttribute("data-sidebar-color", sidebarColor);
      } catch {
        // keep defaults
      }
    };
    void run();
  }, [authLoading, isAuthenticated, isSecurityVerified]);

  if (authLoading || !isAuthenticated || !isSecurityVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <LottieLoader label="Loading..." />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AdminSidebar />

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="flex w-[min(100vw-2rem,20rem)] max-w-[20rem] flex-col border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Main menu</SheetTitle>
          </SheetHeader>
          <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-5 pr-12">
            <span className="text-lg font-bold text-sidebar-primary-foreground">Menu</span>
          </div>
          <AdminSidebarNav onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminHeader onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="admin-main flex-1 overflow-x-auto overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
