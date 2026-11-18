export type PaymentSettingsPagePayload = {
  platformFeePercent: number;
  platformFeeFlat: number;
  minWithdrawal: number;
  enableCard: boolean;
  enableBank: boolean;
  enablePaypal: boolean;
  enableCryptoOut: boolean;
};
