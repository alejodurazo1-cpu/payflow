import { describe, it, expect, vi } from 'vitest';
import { SmartRouter } from '../src/router/smart-router.js';
import type { ProcessorAdapter } from '../src/adapters/types.js';
import type { PaymentRequest, ProcessorResult } from '@payflow/shared';

function createMockAdapter(name: 'stripe' | 'paypal', successRate: number, cost: number): ProcessorAdapter {
  return {
    name,
    charge: vi.fn().mockImplementation(async (req: PaymentRequest): Promise<ProcessorResult> => ({
      processor: name,
      success: Math.random() < successRate,
      transactionId: `${name}_${Date.now()}`,
      processingTimeMs: 100,
      fee: { amount: cost, currency: req.amount.currency },
      status: 'succeeded',
    })),
    refund: vi.fn(),
    isAvailable: vi.fn().mockResolvedValue(true),
  };
}

describe('SmartRouter', () => {
  it('picks the cheapest available processor', async () => {
    const router = new SmartRouter();

    const stripeMock = createMockAdapter('stripe', 0.95, 2.90);
    const paypalMock = createMockAdapter('paypal', 0.92, 3.98);

    router.registerProcessor(stripeMock);
    router.registerProcessor(paypalMock);

    const request: PaymentRequest = {
      id: 'req_1',
      merchantId: 'merchant_1',
      amount: { amount: 100, currency: 'USD' },
      method: 'card',
    };

    const decision = await router.decide(request);
    expect(decision.selectedProcessor).toBe('stripe');
    expect(decision.fallbackProcessors).toContain('paypal');
  });

  it('falls back when primary processor is unavailable', async () => {
    const router = new SmartRouter();
    const stripeMock = createMockAdapter('stripe', 0.95, 2.90);

    vi.mocked(stripeMock.isAvailable).mockResolvedValue(false);

    const paypalMock = createMockAdapter('paypal', 0.92, 3.98);
    router.registerProcessor(stripeMock);
    router.registerProcessor(paypalMock);

    const request: PaymentRequest = {
      id: 'req_2',
      merchantId: 'merchant_1',
      amount: { amount: 100, currency: 'USD' },
      method: 'card',
    };

    const decision = await router.decide(request);
    expect(decision.selectedProcessor).toBe('paypal');
  });

  it('executes with fallback on primary failure', async () => {
    const router = new SmartRouter();

    const stripeMock: ProcessorAdapter = {
      name: 'stripe',
      charge: vi.fn().mockResolvedValue({
        processor: 'stripe' as const,
        success: false,
        error: 'Card declined',
        processingTimeMs: 50,
        fee: { amount: 0, currency: 'USD' },
        status: 'failed',
      }),
      refund: vi.fn(),
      isAvailable: vi.fn().mockResolvedValue(true),
    };

    const paypalMock: ProcessorAdapter = {
      name: 'paypal',
      charge: vi.fn().mockResolvedValue({
        processor: 'paypal' as const,
        success: true,
        transactionId: 'pp_123',
        processingTimeMs: 120,
        fee: { amount: 3.98, currency: 'USD' },
        status: 'succeeded',
      }),
      refund: vi.fn(),
      isAvailable: vi.fn().mockResolvedValue(true),
    };

    router.registerProcessor(stripeMock);
    router.registerProcessor(paypalMock);

    const request: PaymentRequest = {
      id: 'req_3',
      merchantId: 'merchant_1',
      amount: { amount: 100, currency: 'USD' },
      method: 'card',
    };

    const decision = await router.decide(request);
    const { primary, fallbacks } = await router.execute(request, decision);

    expect(primary.success).toBe(false);
    expect(fallbacks.length).toBeGreaterThan(0);
    expect(fallbacks[0].success).toBe(true);
    expect(fallbacks[0].processor).toBe('paypal');
  });
});
