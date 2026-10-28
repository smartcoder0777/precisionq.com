import PatientServices from "@/views/PatientServices";
import { loadPatientServicesPagePayload } from "@/server/patient-services-page";

export default async function Page() {
  const payload = await loadPatientServicesPagePayload();
  return <PatientServices initialCategories={payload.categories} />;
}
