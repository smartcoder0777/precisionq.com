/**
 * Controllers: map HTTP concerns to models. Route handlers stay thin.
 */
export { healthController } from "./health.controller";
export type { HttpResult } from "./health.controller";
export { authController } from "./auth.controller";
export { ticketsController } from "./tickets.controller";
export { clinicsController } from "./clinics.controller";
export {
  communityServiceCategoriesController,
  communityServicesTableController,
} from "./community-services.controller";
export { patientServiceCategoriesController } from "./patient-service-categories.controller";
export { patientServicesTableController } from "./patient-services-table.controller";
export { educationController } from "./education.controller";
export { educationCategoriesController } from "./education-categories.controller";
export { insuranceController } from "./insurance.controller";
export { agreementsController } from "./agreements.controller";
export { productServicesController } from "./product-services.controller";
export { productCategoriesController } from "./product-categories.controller";
export { payTypesController } from "./pay-types.controller";
export { paymentCyclesController } from "./payment-cycles.controller";
export { billingCycleCategoriesController } from "./billing-cycle-categories.controller";
export { securityQuestionsController } from "./security-questions.controller";
export { rolesPermissionsController } from "./roles-permissions.controller";
export { generalSettingsController } from "./general-settings.controller";
export { wordsController } from "./words.controller";
export { qpSettingsController } from "./qp-settings.controller";
export { paymentsController } from "./payments.controller";
export { usersController } from "./users.controller";
export { surveyController } from "./survey.controller";
export { surveySettingsController } from "./survey-settings.controller";
export { externalApiController } from "./external-api.controller";
