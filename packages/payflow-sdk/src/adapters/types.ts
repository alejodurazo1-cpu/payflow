import type { PaymentRequest, ProcessorResult, ProcessorName } from '@payflow/shared';

export interface AdapterConfig {
  apiKey: string;
  webhookSecret?: string;
  sandbox: boolean;
  local?: boolean;
}

export interface ProcessorAdapter {
  readonly name: ProcessorName;
  charge(request: PaymentRequest): Promise<ProcessorResult>;
  refund(transactionId: string, amount?: number): Promise<ProcessorResult>;
  isAvailable(): Promise<boolean>;
}
