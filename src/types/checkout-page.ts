export type CheckoutProductOption = {
  id: number;
  label: string;
  price: number;
  currency: string;
};

export type CheckoutSellerOption = {
  id: number;
  label: string;
};

export type CheckoutPagePayload = {
  products: CheckoutProductOption[];
  sellers: CheckoutSellerOption[];
  enabledMethods: {
    card: boolean;
    bank: boolean;
    paypal: boolean;
  };
  stripePublishableKey: string | null;
};
