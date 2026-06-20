import type { PaymentRequest, ProcessorResult, ProcessorName, TransactionRecord, MerchantConfig, CurrencyCode, Money } from '@payflow/shared';
import { StripeAdapter } from './adapters/stripe-adapter.js';
import { PaypalAdapter } from './adapters/paypal-adapter.js';
import { SmartRouter } from './router/smart-router.js';
import type { AdapterConfig, ProcessorAdapter } from './adapters/types.js';

export interface PayFlowConfig {
  stripe?: AdapterConfig;
  paypal?: AdapterConfig;
  braintree?: AdapterConfig;
  adyen?: AdapterConfig;
  square?: AdapterConfig;
}

export class PayFlowClient {
  private router: SmartRouter;
  private adapters: Map<ProcessorName, ProcessorAdapter> = new Map();
  private transactions: TransactionRecord[] = [];

  constructor(config: PayFlowConfig) {
    this.router = new SmartRouter();

    if (config.stripe) {
      const adapter = new StripeAdapter(config.stripe);
      this.adapters.set('stripe', adapter);
      this.router.registerProcessor(adapter);
    }

    if (config.paypal) {
      const adapter = new PaypalAdapter(config.paypal);
      this.adapters.set('paypal', adapter);
      this.router.registerProcessor(adapter);
    }
  }

  registerMerchant(config: MerchantConfig): void {
    this.router.registerMerchant(config);
  }

  async processPayment(request: PaymentRequest): Promise<TransactionRecord> {
    const decision = await this.router.decide(request);
    const { primary, fallbacks } = await this.router.execute(request, decision);

    const allResults = [primary, ...fallbacks];
    const successful = allResults.find(r => r.success);
    const finalStatus = successful?.status ?? 'failed';

    const record: TransactionRecord = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      paymentRequest: request,
      routingDecision: decision,
      primaryResult: primary,
      fallbackResults: fallbacks.length > 0 ? fallbacks : undefined,
      finalStatus,
      totalFee: this.calculateTotalFee(allResults.filter(r => r.success)),
      createdAt: new Date().toISOString(),
    };

    this.transactions.push(record);
    return record;
  }

  getTransactions(): TransactionRecord[] {
    return this.transactions;
  }

  getTransaction(id: string): TransactionRecord | undefined {
    return this.transactions.find(t => t.id === id);
  }

  private calculateTotalFee(results: ProcessorResult[]): Money {
    const total = results.reduce((sum, r) => sum + r.fee.amount, 0);
    return { amount: total, currency: (results[0]?.fee.currency ?? 'USD') as CurrencyCode };
  }
}
