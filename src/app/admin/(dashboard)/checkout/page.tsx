import Checkout from "@/views/Checkout";
import { loadCheckoutPagePayload } from "@/server/checkout-page";

export default async function Page() {
  const payload = await loadCheckoutPagePayload();
  return <Checkout {...payload} />;
}
