"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Settings,
  User,
  LogOut,
  ChevronDown,
  Menu,
  Sun,
  Moon,
  SlidersHorizontal,
  GraduationCap,
  Package,
  Wallet,
  CalendarClock,
  Repeat,
  ClipboardList,
  Palette,
  ShieldQuestion,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ROUTES, adminPage } from "@/routes/index";
import { userPhotoUrl } from "@/lib/public-media";

const SETTINGS_GROUPS = [
  {
    label: "General",
    items: [
      { title: "General", path: adminPage("/settings/general"), icon: SlidersHorizontal },
    ],
  },
  {
    label: "Catalog",
    items: [
      { title: "Education Category", path: adminPage("/settings/education-category"), icon: GraduationCap },
      { title: "Product Category", path: adminPage("/settings/product-category"), icon: Package },
    ],
  },
  {
    label: "Billing",
    items: [
      { title: "Pay Type", path: adminPage("/settings/pay-type"), icon: Wallet },
      { title: "Payment Cycle", path: adminPage("/settings/payment-cycle"), icon: CalendarClock },
      { title: "Billing Cycle Category", path: adminPage("/settings/billing-cycle"), icon: Repeat },
    ],
  },
  {
    label: "Survey / QP",
    items: [
      { title: "Survey Settings", path: adminPage("/settings/survey"), icon: ClipboardList },
      { title: "QP Setting", path: adminPage("/settings/qp"), icon: Palette },
    ],
  },
  {
    label: "Security / Admin",
    items: [
      { title: "Security Question", path: adminPage("/settings/security-question"), icon: ShieldQuestion },
      { title: "Roles and Permissions", path: adminPage("/settings/roles-permissions"), icon: Users },
    ],
  },
];

type AdminHeaderProps = {
  /** Opens the mobile navigation drawer (lg+ hidden). */
  onOpenMobileNav?: () => void;
};

const AdminHeader = ({ onOpenMobileNav }: AdminHeaderProps) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDark = document.documentElement.classList.contains("dark");
    setThemeMode(isDark ? "dark" : "light");
  }, []);

  const handleLogout = () => {
    void logout();
    router.push(ROUTES.LOGIN);
  };

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U"
    : "U";

  const setTheme = (next: "light" | "dark") => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", next === "dark");
    window.localStorage.setItem("care_hub_theme_mode_override", next);
    setThemeMode(next);
  };

  return (
    <header className="flex h-auto min-h-16 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2 sm:h-16 sm:flex-nowrap sm:px-6 sm:py-0">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {onOpenMobileNav ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 lg:hidden"
            onClick={onOpenMobileNav}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        ) : null}
        <h2 className="min-w-0 truncate text-sm font-medium text-foreground sm:text-base">
          <span className="hidden sm:inline">Welcome, </span>
          <span className="text-primary font-semibold">
            <span className="sm:hidden">{user?.firstName}</span>
            <span className="hidden sm:inline">
              {user?.firstName} {user?.lastName}
            </span>
          </span>
        </h2>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-muted transition-colors" title="Theme mode">
              {themeMode === "dark" ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" /> Light Mode
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" /> Dark Mode
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-muted transition-colors">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {SETTINGS_GROUPS.map((group, idx) => (
              <div key={group.label}>
                {idx > 0 ? <DropdownMenuSeparator /> : null}
                <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </div>
                {group.items.map((item) => (
                  <DropdownMenuItem key={item.path} asChild>
                    <Link href={item.path} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <span>{item.title}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userPhotoUrl(user?.photo)} alt={user ? `${user.firstName} ${user.lastName}` : "User"} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={ROUTES.PROFILE}>
                <User className="mr-2 h-4 w-4" /> My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AdminHeader;
