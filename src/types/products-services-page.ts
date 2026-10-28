/** Stored value is a filename (or path) under public upload, not a data URL. */
export type ProductImage = { filename: string; isPrimary: boolean };

export type ProductServicePageRow = {
  id: number;
  name: string;
  type: "Product" | "Service";
  categoryId: number;
  categoryName: string;
  shortDesc: string;
  longDesc: string;
  basePrice: number;
  discount: number;
  payTypeId: number | null;
  payTypeLabel: string;
  paymentCycleId: number | null;
  paymentCycleLabel: string;
  billingCategoryId: number | null;
  billingCategoryLabel: string;
  images: ProductImage[];
  video: string;
  status: "Active" | "Inactive" | "Draft";
  taxRequired: boolean;
};

export type ProductServiceSelectOption = { id: number; label: string };

export type ProductsServicesPagePayload = {
  rows: ProductServicePageRow[];
  categoryOptions: ProductServiceSelectOption[];
  payTypeOptions: ProductServiceSelectOption[];
  paymentCycleOptions: ProductServiceSelectOption[];
  billingCategoryOptions: ProductServiceSelectOption[];
};
