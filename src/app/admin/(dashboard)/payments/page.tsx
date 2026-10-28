import Payments from "@/views/Payments";
import { loadPaymentsPagePayload } from "@/server/payments-page";

export default async function Page() {
  const payload = await loadPaymentsPagePayload();
  return <Payments {...payload} />;
}
