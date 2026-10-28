import Clinics from "@/views/Clinics";
import { loadClinicsPagePayload } from "@/server/clinics-page";

export default async function Page() {
  const payload = await loadClinicsPagePayload();
  return <Clinics initialClinics={payload.clinics} insuranceOptions={payload.insuranceOptions} />;
}
