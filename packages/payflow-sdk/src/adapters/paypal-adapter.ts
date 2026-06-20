import type { PaymentRequest, ProcessorResult, ProcessorName } from '@payflow/shared';
import type { ProcessorAdapter, AdapterConfig } from './types.js';

interface PaypalOrderResponse {
  id: string;
  status: 'COMPLETED' | 'APPROVED' | 'CREATED' | 'VOIDED';
  purchase_units: Array<{
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount: { value: string; currency_code: string };
      }>;
    };
  }>;
}

export class PaypalAdapter implements ProcessorAdapter {
  readonly name: ProcessorName = 'paypal';
  private baseUrl: string;

  constructor(private config: AdapterConfig) {
    this.baseUrl = config.sandbox
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';
  }

  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.config.apiKey}:${this.config.webhookSecret ?? ''}`).toString('base64');
    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const data = await res.json() as { access_token: string };
    return data.access_token;
  }

  async charge(request: PaymentRequest): Promise<ProcessorResult> {
    const start = Date.now();

    if (this.config.local) {
      await new Promise(r => setTimeout(r, 120));
      return {
        processor: this.name,
        success: true,
        transactionId: `pp_local_${Date.now()}`,
        processingTimeMs: Date.now() - start,
        fee: {
          amount: Math.round(request.amount.amount * 0.0349 * 100) / 100 + 0.49,
          currency: request.amount.currency,
        },
        status: 'succeeded',
      };
    }

    try {
      const token = await this.getAccessToken();
      const res = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: {
              currency_code: request.amount.currency,
              value: request.amount.amount.toFixed(2),
            },
            custom_id: request.id,
          }],
        }),
      });

      const order = await res.json() as PaypalOrderResponse;

      if (order.status === 'CREATED' || order.status === 'APPROVED') {
        return {
          processor: this.name,
          success: true,
          transactionId: order.id,
          processingTimeMs: Date.now() - start,
          fee: {
            amount: Math.round(request.amount.amount * 0.0349) + 0.49,
            currency: request.amount.currency,
          },
          status: 'processing',
        };
      }

      return {
        processor: this.name,
        success: false,
        error: `PayPal order status: ${order.status}`,
        processingTimeMs: Date.now() - start,
        fee: { amount: 0, currency: request.amount.currency },
        status: 'failed',
      };
    } catch (err) {
      return {
        processor: this.name,
        success: false,
        error: err instanceof Error ? err.message : 'PayPal charge failed',
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
      const token = await this.getAccessToken();
      const body: Record<string, unknown> = {};
      if (amount) {
        body.amount = { value: amount.toFixed(2), currency_code: 'USD' };
      }

      const res = await fetch(`${this.baseUrl}/v2/payments/captures/${transactionId}/refund`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        return {
          processor: this.name,
          success: true,
          transactionId,
          processingTimeMs: Date.now() - start,
          fee: { amount: 0, currency: 'USD' },
          status: 'succeeded',
        };
      }

      return {
        processor: this.name,
        success: false,
        error: `PayPal refund failed with status ${res.status}`,
        processingTimeMs: Date.now() - start,
        fee: { amount: 0, currency: 'USD' },
        status: 'failed',
      };
    } catch (err) {
      return {
        processor: this.name,
        success: false,
        error: err instanceof Error ? err.message : 'PayPal refund failed',
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
