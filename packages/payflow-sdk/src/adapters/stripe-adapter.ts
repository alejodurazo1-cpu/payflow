import Stripe from 'stripe';
import type { PaymentRequest, ProcessorResult, ProcessorName } from '@payflow/shared';
import type { ProcessorAdapter, AdapterConfig } from './types.js';

export class StripeAdapter implements ProcessorAdapter {
  readonly name: ProcessorName = 'stripe';
  private client: Stripe | null = null;

  constructor(private config: AdapterConfig) {
    if (!config.local) {
      this.client = new Stripe(config.apiKey, {
        apiVersion: '2025-02-24.acacia',
      });
    }
  }

  async charge(request: PaymentRequest): Promise<ProcessorResult> {
    const start = Date.now();

    if (this.config.local) {
      await new Promise(r => setTimeout(r, 80));
      return {
        processor: this.name,
        success: true,
        transactionId: `pi_local_${Date.now()}`,
        processingTimeMs: Date.now() - start,
        fee: {
          amount: Math.round(request.amount.amount * 0.029 * 100) / 100 + 0.30,
          currency: request.amount.currency,
        },
        status: 'succeeded',
      };
    }

    try {
      const payment = await this.client!.paymentIntents.create({
        amount: Math.round(request.amount.amount * 100),
        currency: request.amount.currency.toLowerCase(),
        payment_method_types: ['card'],
        metadata: { payflowRequestId: request.id },
      });

      return {
        processor: this.name,
        success: true,
        transactionId: payment.id,
        processingTimeMs: Date.now() - start,
        fee: {
          amount: Math.round(request.amount.amount * 0.029 * 100) / 100 + 0.30,
          currency: request.amount.currency,
        },
        status: payment.status === 'succeeded' ? 'succeeded' : 'processing',
      };
    } catch (err) {
      return {
        processor: this.name,
        success: false,
        error: err instanceof Error ? err.message : 'Stripe charge failed',
        processingTimeMs: Date.now() - start,
        fee: { amount: 0, currency: request.amount.currency },
        status: 'failed',
      };
    }
  }

  async refund(transactionId: string, amount?: number): Promise<ProcessorResult> {
    const start = Date.now();

    if (this.config.local) {
      return {
        processor: this.name,
        success: true,
        transactionId,
        processingTimeMs: Date.now() - start,
        fee: { amount: 0, currency: 'USD' },
        status: 'succeeded',
      };
    }

    try {
      await this.client!.refunds.create({
        payment_intent: transactionId,
        amount: amount ? Math.round(amount * 100) : undefined,
      });
      return {
        processor: this.name,
        success: true,
        transactionId,
        processingTimeMs: Date.now() - start,
        fee: { amount: 0, currency: 'USD' },
        status: 'succeeded',
      };
    } catch (err) {
      return {
        processor: this.name,
        success: false,
        error: err instanceof Error ? err.message : 'Stripe refund failed',
        processingTimeMs: Date.now() - start,
        fee: { amount: 0, currency: 'USD' },
        status: 'failed',
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
