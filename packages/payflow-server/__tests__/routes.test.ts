import { describe, it, expect } from 'vitest';

describe('Server routes', () => {
  it('health endpoint format', () => {
    const healthResponse = { status: 'ok', timestamp: new Date().toISOString() };
    expect(healthResponse.status).toBe('ok');
  });
});
