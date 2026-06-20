import type {
  PaymentRequest,
  ProcessorName,
  ProcessorResult,
  RoutingDecision,
  MerchantConfig,
} from '@payflow/shared';
import type { ProcessorAdapter } from '../adapters/types.js';

interface ProcessorCost {
  name: ProcessorName;
  estimatedCost: number;
  estimatedSuccessRate: number;
  isAvailable: boolean;
  priority: number;
}

export class SmartRouter {
  private processors: Map<ProcessorName, ProcessorAdapter> = new Map();
  private merchantConfigs: Map<string, MerchantConfig> = new Map();
  private costCache: Map<ProcessorName, ProcessorCost> = new Map();

  registerProcessor(adapter: ProcessorAdapter): void {
    this.processors.set(adapter.name, adapter);
  }

  registerMerchant(config: MerchantConfig): void {
    this.merchantConfigs.set(config.id, config);
  }

  async decide(request: PaymentRequest): Promise<RoutingDecision> {
    const merchant = this.merchantConfigs.get(request.merchantId);
    const allowedProcessors = merchant?.preferredProcessors ?? Array.from(this.processors.keys());

    const costs = await this.evaluateProcessors(request, allowedProcessors);

    const sorted = costs.sort((a, b) => {
      if (a.isAvailable && !b.isAvailable) return -1;
      if (!a.isAvailable && b.isAvailable) return 1;
      const scoreA = a.estimatedSuccessRate - a.estimatedCost * 0.1;
      const scoreB = b.estimatedSuccessRate - b.estimatedCost * 0.1;
      return scoreB - scoreA;
    });

    const best = sorted[0];
    if (!best) {
      return {
        selectedProcessor: 'stripe',
        reason: 'No processors available, defaulting to stripe',
        estimatedCost: { amount: 0, currency: request.amount.currency },
        estimatedSuccessRate: 0,
        fallbackProcessors: [],
      };
    }

    const fallbacks = sorted
      .slice(1, 3)
      .filter(p => p.isAvailable)
      .map(p => p.name);

    return {
      selectedProcessor: best.name,
      reason: best.isAvailable
        ? `Best cost-to-success ratio (cost: $${best.estimatedCost.toFixed(2)}, success: ${(best.estimatedSuccessRate * 100).toFixed(0)}%)`
        : `Only available processor`,
      estimatedCost: { amount: best.estimatedCost, currency: request.amount.currency },
      estimatedSuccessRate: best.estimatedSuccessRate,
      fallbackProcessors: fallbacks,
    };
  }

  async execute(
    request: PaymentRequest,
    decision: RoutingDecision,
  ): Promise<{ primary: ProcessorResult; fallbacks: ProcessorResult[] }> {
    const primaryAdapter = this.processors.get(decision.selectedProcessor);
    if (!primaryAdapter) {
      throw new Error(`Processor ${decision.selectedProcessor} not registered`);
    }

    const primary = await primaryAdapter.charge(request);
    const fallbacks: ProcessorResult[] = [];

    if (!primary.success && decision.fallbackProcessors.length > 0) {
      for (const fallbackName of decision.fallbackProcessors) {
        const adapter = this.processors.get(fallbackName);
        if (!adapter) continue;
        const result = await adapter.charge(request);
        fallbacks.push(result);
        if (result.success) break;
      }
    }

    return { primary, fallbacks };
  }

  private async evaluateProcessors(
    request: PaymentRequest,
    allowed: ProcessorName[],
  ): Promise<ProcessorCost[]> {
    const results: ProcessorCost[] = [];

    for (const [name, adapter] of this.processors) {
      if (!allowed.includes(name)) continue;

      const cached = this.costCache.get(name);
      if (cached && Date.now() < 30000) {
        results.push(cached);
        continue;
      }

      const available = await adapter.isAvailable();
      const cost = request.amount.amount * this.getFeeRate(name) + this.getFixedFee(name);

      const costEntry: ProcessorCost = {
        name,
        estimatedCost: cost,
        estimatedSuccessRate: this.getBaseSuccessRate(name),
        isAvailable: available,
        priority: allowed.indexOf(name),
      };

      this.costCache.set(name, {
        ...costEntry,
        isAvailable: available,
      });

      results.push(costEntry);
    }

    return results;
  }

  private getFeeRate(processor: ProcessorName): number {
    const rates: Record<ProcessorName, number> = {
      stripe: 0.029,
      paypal: 0.0349,
      braintree: 0.0259,
      adyen: 0.025,
      square: 0.026,
    };
    return rates[processor] ?? 0.029;
  }

  private getFixedFee(processor: ProcessorName): number {
    const fees: Record<ProcessorName, number> = {
      stripe: 0.30,
      paypal: 0.49,
      braintree: 0.49,
      adyen: 0.25,
      square: 0.15,
    };
    return fees[processor] ?? 0.30;
  }

  private getBaseSuccessRate(processor: ProcessorName): number {
    const rates: Record<ProcessorName, number> = {
      stripe: 0.94,
      paypal: 0.92,
      braintree: 0.91,
      adyen: 0.95,
      square: 0.93,
    };
    return rates[processor] ?? 0.90;
  }
}
