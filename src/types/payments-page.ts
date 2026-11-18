export type PaymentPageRow = {
  id: number;
  paymentId: string;
  customerName: string;
  email: string;
  phone: string;
  amount: number;
  cardLast4: string;
  cardBrand: string;
  status: "succeeded" | "pending" | "failed" | "refunded";
  createdAt: string;
  invoiceId: string;
  invoiceUrl: string;
  description: string;
  currency: string;
  provider: string;
  method: string;
  orderId: number | null;
};

export type PaymentsPagePayload = {
  rows: PaymentPageRow[];
  canDeleteAll: boolean;
};
