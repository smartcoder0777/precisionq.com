import "server-only";

import { productServiceRecordToPageRow } from "@/lib/product-service-db-mapper";
import * as BillingCycleCategoryModel from "@/models/settings/billing-cycle-category.model";
import * as PayTypeModel from "@/models/settings/pay-type.model";
import * as PaymentCycleModel from "@/models/settings/payment-cycle.model";
import * as ProductCategoryModel from "@/models/settings/product-category.model";
import * as ProductServiceModel from "@/models/product-service.model";
import type { ProductsServicesPagePayload, ProductServiceSelectOption } from "@/types/products-services-page";

function toOptions(rows: { id: number; label: string }[]): ProductServiceSelectOption[] {
  return rows.map(r => ({ id: r.id, label: r.label }));
}

export async function loadProductsServicesPagePayload(): Promise<ProductsServicesPagePayload> {
  const [productRows, categories, payTypes, paymentCycles, billingCats] = await Promise.all([
    ProductServiceModel.getAllProductServices(),
    ProductCategoryModel.getAllProductCategories(),
    PayTypeModel.getAllPayTypes(),
    PaymentCycleModel.getAllPaymentCycles(),
    BillingCycleCategoryModel.getAllBillingCycleCategories(),
  ]);

  const categoryOptions: ProductServiceSelectOption[] = toOptions(
    categories.map(c => ({
      id: c.id,
      label: (c.name ?? "").trim() || `Category #${c.id}`,
    })),
  );
  const payTypeOptions: ProductServiceSelectOption[] = toOptions(
    payTypes.map(p => ({
      id: p.id,
      label: (p.type_name ?? "").trim() || (p.type_code ?? "").trim() || `Pay type #${p.id}`,
    })),
  );
  const paymentCycleOptions: ProductServiceSelectOption[] = toOptions(
    paymentCycles.map(c => ({
      id: c.id,
      label: (c.cycle_name ?? "").trim() || (c.cycle_code ?? "").trim() || `Cycle #${c.id}`,
    })),
  );
  const billingCategoryOptions: ProductServiceSelectOption[] = toOptions(
    billingCats.map(b => ({
      id: b.id,
      label: (b.category_name ?? "").trim() || (b.category_code ?? "").trim() || `Billing #${b.id}`,
    })),
  );

  const catMap = new Map(categoryOptions.map(o => [o.id, o.label]));
  const payMap = new Map(payTypeOptions.map(o => [o.id, o.label]));
  const cycleMap = new Map(paymentCycleOptions.map(o => [o.id, o.label]));
  const billMap = new Map(billingCategoryOptions.map(o => [o.id, o.label]));

  const rows = productRows.map(r =>
    productServiceRecordToPageRow(r, {
      categoryName: id => (id <= 0 ? "—" : catMap.get(id) ?? `#${id}`),
      payTypeLabel: id => (id == null ? "" : payMap.get(id) ?? `#${id}`),
      paymentCycleLabel: id => (id == null ? "" : cycleMap.get(id) ?? `#${id}`),
      billingCategoryLabel: id => (id == null ? "" : billMap.get(id) ?? `#${id}`),
    }),
  );

  return {
    rows,
    categoryOptions,
    payTypeOptions,
    paymentCycleOptions,
    billingCategoryOptions,
  };
}
