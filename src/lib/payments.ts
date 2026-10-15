export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'DISPUTED' | 'CANCELLED';

export type PaymentIntent = {
  orderId: string;
  amount: number;
  currency: string;
  customerId: string;
  idempotencyKey: string;
};

export type PaymentResult = {
  provider: string;
  paymentId: string;
  checkoutUrl: string | null;
  status: PaymentStatus;
};

export interface PaymentProvider {
  readonly name: string;
  createPayment(intent: PaymentIntent): Promise<PaymentResult>;
  verifyWebhook(request: Request): Promise<{ reference: string; orderId: string; status: PaymentStatus }>;
  createPayout(input: { amount: number; currency: string; destination: string; idempotencyKey: string }): Promise<{ reference: string; status: 'PROCESSING' | 'COMPLETED' | 'FAILED' }>;
}

export const unavailablePaymentProvider: PaymentProvider = {
  name: 'not_configured',
  async createPayment(): Promise<PaymentResult> {
    throw new Error('Payment provider is not configured');
  },
  async verifyWebhook(): Promise<{ reference: string; orderId: string; status: PaymentStatus }> {
    throw new Error('Payment provider is not configured');
  },
  async createPayout(): Promise<{ reference: string; status: 'PROCESSING' | 'COMPLETED' | 'FAILED' }> {
    throw new Error('Payment provider is not configured');
  },
};
