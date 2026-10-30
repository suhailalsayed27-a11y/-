export interface FeeBreakdown {
  service_price: number;
  customer_fee: number;
  provider_fee: number;
  customer_total: number;
  provider_net: number;
  mahra_revenue: number;
}

// تم تعديل القيم إلى صفر لتتطابق مع إعداداتك في قاعدة البيانات
const DEFAULT_CUSTOMER_PCT = 0;
const DEFAULT_PROVIDER_PCT = 0;
const MIN_FEE = 0;

export function calculateFees(price: number): FeeBreakdown {
  const customer_fee = Math.max(price * (DEFAULT_CUSTOMER_PCT / 100), MIN_FEE);
  const provider_fee = Math.max(price * (DEFAULT_PROVIDER_PCT / 100), MIN_FEE);
  return {
    service_price: price,
    customer_fee,
    provider_fee,
    customer_total: price + customer_fee,
    provider_net: price - provider_fee,
    mahra_revenue: customer_fee + provider_fee,
  };
}

export function formatYER(amount: number): string {
  return Number(amount).toLocaleString('ar-EG');
}