import { AiProviderHealthStatus, AiProviderLifecycleStatus } from './ai-provider-enums';

/**
 * IAiProviderHealth
 */
export interface IAiProviderHealth {
  providerKey: string;
  status: AiProviderHealthStatus;
  lifecycleStatus: AiProviderLifecycleStatus;
  lastCheckedAt: Date;
  latencyMs?: number;
  message?: string;
}
