/**
 * Every `mysqlTable` in one object for `drizzle(pool, { schema })`.
 * Column list exports (`*_COLUMNS`) stay in `src/db/schema/*.ts` and are not part of this map.
 */
import { agreements, clinicInsurances, clinics, insurances } from "./schema/clinics-agreements";
import { communityServiceCats, communityServices } from "./schema/community";
import {
  billingCycleCategories,
  educationCategories,
  educations,
  invoices,
  paymentCycles,
  payments,
  payTypes,
  productCategories,
  productServices,
} from "./schema/education-products";
import { patientServiceCats, patientServices } from "./schema/patient-services";
import {
  eventStatus,
  generalSettings,
  languages,
  settings,
  words,
} from "./schema/settings-ref";
import {
  surveyCategories,
  surveyExpirations,
  surveyFeedbacks,
  surveyFooter,
  surveyQuestions,
  surveyQuesTypes,
  surveyResponses,
  surveys,
  surveyTypes,
  surveyViews,
} from "./schema/surveys";
import { contactTracks, tickets } from "./schema/tickets-contact";
import {
  permissions,
  rolePermissions,
  roles,
  securityQuestions,
  userSecurities,
  users,
} from "./schema/users-roles";

export const drizzleSchema = {
  communityServiceCats,
  communityServices,
  users,
  roles,
  permissions,
  rolePermissions,
  securityQuestions,
  userSecurities,
  settings,
  words,
  generalSettings,
  languages,
  eventStatus,
  clinics,
  insurances,
  clinicInsurances,
  agreements,
  patientServiceCats,
  patientServices,
  educations,
  educationCategories,
  productCategories,
  payTypes,
  billingCycleCategories,
  paymentCycles,
  productServices,
  payments,
  invoices,
  surveys,
  surveyViews,
  surveyCategories,
  surveyTypes,
  surveyResponses,
  surveyQuestions,
  surveyExpirations,
  surveyFeedbacks,
  surveyFooter,
  surveyQuesTypes,
  tickets,
  contactTracks,
} as const;
