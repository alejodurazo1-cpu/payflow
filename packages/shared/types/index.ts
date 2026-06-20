export type ProcessorName = 'stripe' | 'paypal' | 'braintree' | 'adyen' | 'square';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'MXN' | 'BRL' | 'ARS';

export type PaymentMethod = 'card' | 'paypal' | 'wallet' | 'bank_transfer' | 'bnpl';

export type TransactionStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';

export interface Money {
  amount: number;
  currency: CurrencyCode;
}

export interface PaymentRequest {
  id: string;
  merchantId: string;
  amount: Money;
  method: PaymentMethod;
  cardLastFour?: string;
  cardBrand?: string;
  customerCountry?: string;
  processorPreferences?: ProcessorName[];
}

export interface ProcessorResult {
  processor: ProcessorName;
  success: boolean;
  transactionId?: string;
  error?: string;
  processingTimeMs: number;
  fee: Money;
  status: TransactionStatus;
}

export interface RoutingDecision {
  selectedProcessor: ProcessorName;
  reason: string;
  estimatedCost: Money;
  estimatedSuccessRate: number;
  fallbackProcessors: ProcessorName[];
}

export interface MerchantConfig {
  id: string;
  name: string;
  preferredProcessors: ProcessorName[];
  maxFeeRate: number;
  requireBackup: boolean;
}

export interface TransactionRecord {
  id: string;
  paymentRequest: PaymentRequest;
  routingDecision: RoutingDecision;
  primaryResult?: ProcessorResult;
  fallbackResults?: ProcessorResult[];
  finalStatus: TransactionStatus;
  totalFee: Money;
  createdAt: string;
}
