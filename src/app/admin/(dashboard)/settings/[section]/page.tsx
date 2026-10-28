import PlaceholderPage from "@/views/PlaceholderPage";
import EducationCategoriesSettings from "@/views/EducationCategoriesSettings";
import ProductCategoriesSettings from "@/views/ProductCategoriesSettings";
import PayTypesSettings from "@/views/PayTypesSettings";
import PaymentCyclesSettings from "@/views/PaymentCyclesSettings";
import BillingCycleCategoriesSettings from "@/views/BillingCycleCategoriesSettings";
import SecurityQuestionsSettings from "@/views/SecurityQuestionsSettings";
import RolesPermissions from "@/views/RolesPermissions";
import GeneralSettings from "@/views/GeneralSettings";
import QpSettings from "@/views/QpSettings";
import { loadEducationCategoriesPagePayload } from "@/server/education-categories-page";
import { loadProductCategoriesPagePayload } from "@/server/product-categories-page";
import { loadPayTypesPagePayload } from "@/server/pay-types-page";
import { loadPaymentCyclesPagePayload } from "@/server/payment-cycles-page";
import { loadBillingCycleCategoriesPagePayload } from "@/server/billing-cycle-categories-page";
import { loadSecurityQuestionsPagePayload } from "@/server/security-questions-page";
import { loadRolesPermissionsPagePayload } from "@/server/roles-permissions-page";
import { loadGeneralSettings } from "@/server/general-settings";
import { loadQpSettingsPagePayload } from "@/server/qp-settings-page";

type PageProps = {
  params: Promise<{ section: string }>;
};

export default async function Page({ params }: PageProps) {
  const { section } = await params;

  if (section === "education-category") {
    const payload = await loadEducationCategoriesPagePayload();
    return <EducationCategoriesSettings initialCategories={payload.categories} />;
  }
  if (section === "general") {
    const payload = await loadGeneralSettings();
    return <GeneralSettings initialSettings={payload} />;
  }
  if (section === "product-category") {
    const payload = await loadProductCategoriesPagePayload();
    return <ProductCategoriesSettings initialCategories={payload.categories} />;
  }
  if (section === "pay-type") {
    const payload = await loadPayTypesPagePayload();
    return <PayTypesSettings initialRows={payload.rows} />;
  }
  if (section === "payment-cycle") {
    const payload = await loadPaymentCyclesPagePayload();
    return <PaymentCyclesSettings initialRows={payload.rows} categoryOptions={payload.categoryOptions} />;
  }
  if (section === "billing-cycle") {
    const payload = await loadBillingCycleCategoriesPagePayload();
    return <BillingCycleCategoriesSettings initialRows={payload.rows} />;
  }
  if (section === "security-question") {
    const payload = await loadSecurityQuestionsPagePayload();
    return <SecurityQuestionsSettings initialRows={payload.rows} />;
  }
  if (section === "roles-permissions") {
    const payload = await loadRolesPermissionsPagePayload();
    return <RolesPermissions initialRows={payload.rows} />;
  }
  if (section === "qp") {
    const payload = await loadQpSettingsPagePayload();
    return <QpSettings initialWords={payload.words} initialSettings={payload.settings} />;
  }

  return <PlaceholderPage />;
}
