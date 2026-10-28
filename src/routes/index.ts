/** Browser path prefix for this admin UI (API routes stay under `/api`). */
export const ADMIN = "/admin" as const;

/**
 * Build a path under `/admin`, e.g. `adminPage("/dashboard")` → `/admin/dashboard`.
 */
export function adminPage(relative: string): string {
  const r = relative.startsWith("/") ? relative : `/${relative}`;
  return `${ADMIN}${r}`;
}

/**
 * Paths that used to live at the site root; middleware redirects them to `/admin/...` for bookmarks.
 */
export const LEGACY_ADMIN_PATH_PREFIXES: readonly string[] = [
  "/login",
  "/security",
  "/dashboard",
  "/tickets",
  "/community-services",
  "/patient-services",
  "/clinics",
  "/education",
  "/insurance",
  "/announcement",
  "/survey",
  "/survey-settings",
  "/agreements",
  "/products-services",
  "/payments",
  "/users",
  "/profile",
  "/settings",
];

export const ROUTES = {
  ADMIN,
  /** Site entry (`/`); redirects into `/admin` based on session. */
  HOME: "/",
  LOGIN: adminPage("/login"),
  /** Wrong security answer clears session; use this redirect to show the login error alert. */
  LOGIN_SECURITY_FAILED: `${adminPage("/login")}?security_failed=1`,
  SECURITY: adminPage("/security"),
  DASHBOARD: adminPage("/dashboard"),
  PROFILE: adminPage("/profile"),
  FORBIDDEN: adminPage("/forbidden"),
} as const;

export const API_ROUTES = {
  AUTH_LOGIN: "/api/auth/login",
  AUTH_SECURITY: "/api/auth/security",
  AUTH_SESSION: "/api/auth/session",
  AUTH_LOGOUT: "/api/auth/logout",
  PROFILE: "/api/profile",
  dashboardContactTrack: (id: string) => `/api/dashboard/contact-tracks/${encodeURIComponent(id)}`,
  TICKETS: "/api/tickets",
  ticket: (id: string) => `/api/tickets/${encodeURIComponent(id)}`,
  CLINICS: "/api/clinics",
  clinic: (id: string | number) => `/api/clinics/${encodeURIComponent(String(id))}`,
  clinicInsurances: (id: string | number) =>
    `/api/clinics/${encodeURIComponent(String(id))}/insurances`,
  COMMUNITY_SERVICE_CATS: "/api/community-service-cats",
  communityServiceCat: (id: string | number) =>
    `/api/community-service-cats/${encodeURIComponent(String(id))}`,
  PATIENT_SERVICE_CATS: "/api/patient-service-cats",
  patientServiceCat: (id: string | number) =>
    `/api/patient-service-cats/${encodeURIComponent(String(id))}`,
  COMMUNITY_SERVICES_ROWS: "/api/community-services",
  communityServiceRow: (id: string | number) =>
    `/api/community-services/${encodeURIComponent(String(id))}`,
  PATIENT_SERVICES_ROWS: "/api/patient-services",
  patientServiceRow: (id: string | number) =>
    `/api/patient-services/${encodeURIComponent(String(id))}`,
  EDUCATIONS: "/api/educations",
  education: (id: string | number) => `/api/educations/${encodeURIComponent(String(id))}`,
  EDUCATION_CATEGORIES: "/api/education-categories",
  educationCategory: (id: string | number) => `/api/education-categories/${encodeURIComponent(String(id))}`,
  INSURANCES: "/api/insurances",
  insurance: (id: string | number) => `/api/insurances/${encodeURIComponent(String(id))}`,
  insuranceClinics: (id: string | number) =>
    `/api/insurances/${encodeURIComponent(String(id))}/clinics`,
  AGREEMENTS: "/api/agreements",
  agreement: (id: string | number) => `/api/agreements/${encodeURIComponent(String(id))}`,
  PRODUCT_SERVICES: "/api/product-services",
  productService: (id: string | number) =>
    `/api/product-services/${encodeURIComponent(String(id))}`,
  PRODUCT_CATEGORIES: "/api/product-categories",
  productCategory: (id: string | number) =>
    `/api/product-categories/${encodeURIComponent(String(id))}`,
  PAY_TYPES: "/api/pay-types",
  payType: (id: string | number) => `/api/pay-types/${encodeURIComponent(String(id))}`,
  PAYMENT_CYCLES: "/api/payment-cycles",
  paymentCycle: (id: string | number) => `/api/payment-cycles/${encodeURIComponent(String(id))}`,
  BILLING_CYCLE_CATEGORIES: "/api/billing-cycle-categories",
  billingCycleCategory: (id: string | number) =>
    `/api/billing-cycle-categories/${encodeURIComponent(String(id))}`,
  ROLES: "/api/roles",
  role: (id: string | number) => `/api/roles/${encodeURIComponent(String(id))}`,
  rolePermissions: (id: string | number) => `/api/roles/${encodeURIComponent(String(id))}/permissions`,
  SECURITY_QUESTIONS: "/api/security-questions",
  securityQuestion: (id: string | number) =>
    `/api/security-questions/${encodeURIComponent(String(id))}`,
  SETTINGS_GENERAL: "/api/settings/general",
  SETTINGS_GENERAL_PUBLIC: "/api/settings/general/public",
  SETTINGS_QP: "/api/settings/qp",
  WORDS: "/api/words",
  word: (id: string | number) => `/api/words/${encodeURIComponent(String(id))}`,
  PUBLIC_UPLOAD: "/api/upload/public",
  PAYMENTS_DELETE_ALL: "/api/payments/delete-all",
  payment: (id: string | number) => `/api/payments/${encodeURIComponent(String(id))}`,
  USERS: "/api/users",
  user: (id: string | number) => `/api/users/${encodeURIComponent(String(id))}`,
  userResetPassword: (id: string | number) =>
    `/api/users/${encodeURIComponent(String(id))}/reset-password`,
  userPassword: (id: string | number) => `/api/users/${encodeURIComponent(String(id))}/password`,
  userSecurityQuestions: (id: string | number) =>
    `/api/users/${encodeURIComponent(String(id))}/security-questions`,
  SURVEYS: "/api/surveys",
  survey: (id: string | number) => `/api/surveys/${encodeURIComponent(String(id))}`,
  SURVEY_CATEGORIES: "/api/survey-categories",
  surveyCategory: (id: string | number) => `/api/survey-categories/${encodeURIComponent(String(id))}`,
  SURVEY_TYPES: "/api/survey-types",
  surveyType: (id: string | number) => `/api/survey-types/${encodeURIComponent(String(id))}`,
  SURVEY_QUESTIONS: "/api/survey-questions",
  surveyQuestion: (id: string | number) => `/api/survey-questions/${encodeURIComponent(String(id))}`,
  SURVEY_RESPONSES: "/api/survey-responses",
  surveyResponse: (id: string | number) => `/api/survey-responses/${encodeURIComponent(String(id))}`,
  surveyBuilder: (id: string | number) => `/api/surveys/${encodeURIComponent(String(id))}/builder`,
  surveyPreview: (id: string | number) => `/api/surveys/${encodeURIComponent(String(id))}/preview`,
  SURVEYS_SEND: "/api/surveys/send",
  SURVEYS_PATIENTS: "/api/surveys/patients",
} as const;
