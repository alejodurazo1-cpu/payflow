import { describe, it, expect } from 'vitest';
import { PayFlowClient } from '../src/client.js';

describe('PayFlowClient', () => {
  it('creates a client with config', () => {
    const client = new PayFlowClient({
      stripe: { apiKey: 'sk_test_dummy', sandbox: true },
      paypal: { apiKey: 'test_dummy', webhookSecret: 'secret', sandbox: true },
    });

    expect(client).toBeInstanceOf(PayFlowClient);
  });

  it('starts with empty transactions', () => {
    const client = new PayFlowClient({
      stripe: { apiKey: 'sk_test_dummy', sandbox: true },
    });

    expect(client.getTransactions()).toEqual([]);
  });

  it('registers a merchant', () => {
    const client = new PayFlowClient({
      stripe: { apiKey: 'sk_test_dummy', sandbox: true },
    });

    client.registerMerchant({
      id: 'merchant_1',
      name: 'Test Merchant',
      preferredProcessors: ['stripe'],
      maxFeeRate: 0.03,
      requireBackup: false,
    });

    expect(client.getTransactions()).toEqual([]);
  });
});
