export const ROLE_PAGE_GROUPS = [
  {
    group: "Main",
    pages: [
      { key: "dashboard", label: "Dashboard", actions: ["view"] as const },
      { key: "tickets", label: "Tickets", actions: ["view", "create", "edit", "delete"] as const },
      { key: "community-services", label: "Community Services", actions: ["view", "create", "edit", "delete"] as const },
    ],
  },
  {
    group: "Patient",
    pages: [
      { key: "patient-services", label: "Patient Services", actions: ["view", "create", "edit", "delete"] as const },
      { key: "clinics", label: "Clinics", actions: ["view", "create", "edit", "delete"] as const },
      { key: "insurance", label: "Insurance", actions: ["view", "create", "edit", "delete"] as const },
    ],
  },
  {
    group: "Content",
    pages: [
      { key: "education", label: "Education", actions: ["view", "create", "edit", "delete"] as const },
      { key: "announcement", label: "Announcement", actions: ["view", "create", "edit", "delete"] as const },
      { key: "survey", label: "Survey", actions: ["view", "create", "edit", "delete"] as const },
      { key: "agreements", label: "Agreements", actions: ["view", "create", "edit", "delete"] as const },
    ],
  },
  {
    group: "Commerce",
    pages: [
      { key: "products-services", label: "Products & Services", actions: ["view", "create", "edit", "delete"] as const },
      { key: "payments", label: "Payments", actions: ["view", "create", "edit", "delete"] as const },
    ],
  },
  {
    group: "Administration",
    pages: [
      { key: "users", label: "Users", actions: ["view", "create", "edit", "delete"] as const },
      { key: "roles-permissions", label: "Roles & Permissions", actions: ["view", "create", "edit", "delete"] as const },
      { key: "settings-general", label: "Settings - General", actions: ["view", "edit"] as const },
      { key: "settings-education-category", label: "Settings - Education Category", actions: ["view", "edit"] as const },
      { key: "settings-product-category", label: "Settings - Product Category", actions: ["view", "edit"] as const },
      { key: "settings-pay-type", label: "Settings - Pay Type", actions: ["view", "edit"] as const },
      { key: "settings-payment-cycle", label: "Settings - Payment Cycle", actions: ["view", "edit"] as const },
      { key: "settings-billing-cycle", label: "Settings - Billing Cycle", actions: ["view", "edit"] as const },
      { key: "settings-survey", label: "Settings - Survey", actions: ["view", "edit"] as const },
      { key: "settings-qp", label: "Settings - QP", actions: ["view", "edit"] as const },
      { key: "settings-security-question", label: "Settings - Security Question", actions: ["view", "edit"] as const },
    ],
  },
] as const;

export type RoleAction = "view" | "create" | "edit" | "delete";
export type RoleActionMap = Record<string, RoleAction[]>;

export const ALL_ROLE_PAGES = ROLE_PAGE_GROUPS.flatMap((g) =>
  g.pages.map((p) => ({ ...p, group: g.group })),
);

export function resolvePagePermissionKey(pathname: string): string | null {
  if (!pathname.startsWith("/admin")) return null;
  if (pathname === "/admin/forbidden") return null;
  if (pathname === "/admin/dashboard") return "dashboard";
  if (pathname.startsWith("/admin/profile")) return "users";
  if (pathname.startsWith("/admin/tickets")) return "tickets";
  if (pathname.startsWith("/admin/community-services")) return "community-services";
  if (pathname.startsWith("/admin/patient-services")) return "patient-services";
  if (pathname.startsWith("/admin/clinics")) return "clinics";
  if (pathname.startsWith("/admin/insurance")) return "insurance";
  if (pathname.startsWith("/admin/education")) return "education";
  if (pathname.startsWith("/admin/announcement")) return "announcement";
  if (pathname.startsWith("/admin/survey-settings")) return "settings-survey";
  if (pathname.startsWith("/admin/survey")) return "survey";
  if (pathname.startsWith("/admin/agreements")) return "agreements";
  if (pathname.startsWith("/admin/products-services")) return "products-services";
  if (pathname.startsWith("/admin/payments")) return "payments";
  if (pathname.startsWith("/admin/users")) return "users";
  if (pathname.startsWith("/admin/settings/roles-permissions")) return "roles-permissions";
  if (pathname.startsWith("/admin/settings/general")) return "settings-general";
  if (pathname.startsWith("/admin/settings/education-category")) return "settings-education-category";
  if (pathname.startsWith("/admin/settings/product-category")) return "settings-product-category";
  if (pathname.startsWith("/admin/settings/pay-type")) return "settings-pay-type";
  if (pathname.startsWith("/admin/settings/payment-cycle")) return "settings-payment-cycle";
  if (pathname.startsWith("/admin/settings/billing-cycle")) return "settings-billing-cycle";
  if (pathname.startsWith("/admin/settings/survey")) return "settings-survey";
  if (pathname.startsWith("/admin/settings/qp")) return "settings-qp";
  if (pathname.startsWith("/admin/settings/security-question")) return "settings-security-question";
  return null;
}
