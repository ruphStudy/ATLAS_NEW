import { AiProviderEventType } from './ai-provider-enums';

/**
 * IAiProviderEvent
 *
 * Envelope for every event emitted by the AI provider foundation.
 */
export interface IAiProviderEvent<TPayload = Record<string, unknown>> {
  type: AiProviderEventType;
  providerKey: string;
  workspaceId?: string;
  occurredAt: Date;
  payload?: TPayload;
}
