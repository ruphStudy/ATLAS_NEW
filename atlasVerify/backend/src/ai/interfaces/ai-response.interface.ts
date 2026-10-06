import { IAiCost, IAiTokenUsage } from './ai-usage.interface';

/**
 * IAiResponse
 *
 * Standard response envelope returned by every capability call,
 * regardless of which provider or model served the request.
 */
export interface IAiResponse<TData = unknown> {
  requestId: string;
  providerKey: string;
  modelId: string;
  data: TData;
  usage: IAiTokenUsage;
  cost?: IAiCost;
  latencyMs: number;
  createdAt: Date;
  raw?: unknown;
}
