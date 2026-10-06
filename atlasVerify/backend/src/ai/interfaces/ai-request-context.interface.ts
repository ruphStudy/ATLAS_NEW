import { AiCapability } from './ai-provider-enums';

/**
 * IAiRequestContext
 *
 * Standard context every capability call carries, regardless of provider.
 * `useCase` is an open string (not an enum) so business modules can
 * introduce new use cases without changing this foundation module.
 */
export interface IAiRequestContext {
  requestId: string;
  workspaceId: string;
  userId?: string;
  useCase: string;
  capability: AiCapability;
  locale?: string;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}
