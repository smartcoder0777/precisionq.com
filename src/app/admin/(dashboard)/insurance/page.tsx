import Insurance from "@/views/Insurance";
import { loadInsurancePagePayload } from "@/server/insurance-page";

export default async function Page() {
  const payload = await loadInsurancePagePayload();
  return <Insurance initialRows={payload.rows} clinicOptions={payload.clinicOptions} />;
}
