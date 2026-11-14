export interface FeeBreakdown {
  service_price: number;
  customer_fee: number;
  provider_fee: number;
  customer_total: number;
  provider_net: number;
  mahra_revenue: number;
}

export interface CommissionSettings {
  customer_fee_percentage: number;
  provider_fee_percentage: number;
  minimum_customer_fee: number;
  minimum_provider_fee: number;
}

const DEFAULT_SETTINGS: CommissionSettings = {
  customer_fee_percentage: 0,
  provider_fee_percentage: 0,
  minimum_customer_fee: 0,
  minimum_provider_fee: 0,
};

export function calculateFees(
  price: number,
  settings?: Partial<CommissionSettings> | null
): FeeBreakdown {
  const customerPct = Number(settings?.customer_fee_percentage ?? DEFAULT_SETTINGS.customer_fee_percentage);
  const providerPct = Number(settings?.provider_fee_percentage ?? DEFAULT_SETTINGS.provider_fee_percentage);
  const minCustomerFee = Number(settings?.minimum_customer_fee ?? DEFAULT_SETTINGS.minimum_customer_fee);
  const minProviderFee = Number(settings?.minimum_provider_fee ?? DEFAULT_SETTINGS.minimum_provider_fee);

  const rawCustomerFee = price * (customerPct / 100);
  const rawProviderFee = price * (providerPct / 100);

  const customer_fee = customerPct > 0 ? Math.max(rawCustomerFee, minCustomerFee) : minCustomerFee;
  const provider_fee = providerPct > 0 ? Math.max(rawProviderFee, minProviderFee) : minProviderFee;

  return {
    service_price: price,
    customer_fee,
    provider_fee,
    customer_total: price + customer_fee,
    provider_net: Math.max(0, price - provider_fee),
    mahra_revenue: customer_fee + provider_fee,
  };
}

export function formatYER(amount: number): string {
  return Number(amount).toLocaleString('ar-EG');
}