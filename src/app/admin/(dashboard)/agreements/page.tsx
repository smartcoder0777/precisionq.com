import Agreements from "@/views/Agreements";
import { loadAgreementsPagePayload } from "@/server/agreements-page";

export default async function Page() {
  const payload = await loadAgreementsPagePayload();
  return <Agreements initialRows={payload.rows} clinics={payload.clinics} />;
}
