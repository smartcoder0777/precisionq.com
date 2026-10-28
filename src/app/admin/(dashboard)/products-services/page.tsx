import ProductsServices from "@/views/ProductsServices";
import { loadProductsServicesPagePayload } from "@/server/products-services-page";

export default async function Page() {
  const payload = await loadProductsServicesPagePayload();
  return <ProductsServices {...payload} />;
}
