import { NotificationProviderChannel } from './notification-provider-channel.enum';
import {
  INotificationTimeoutPolicy,
  INotificationRetryPolicy,
  INotificationRateLimitPolicy,
  INotificationFallbackPolicy,
} from './notification-policy.interface';

/**
 * The fully-resolved configuration object handed to an adapter's
 * `initialize()`. `resolvedCredentialFields` carries transiently-decrypted
 * credential values for the duration of initialization only — callers must
 * clear the reference immediately after `initialize()` resolves or rejects,
 * exactly as the AI Provider Foundation's `IAiProviderConfig` does.
 */
export interface INotificationProviderConfig {
  providerKey: string;
  workspaceId: string;
  channel: NotificationProviderChannel;
  enabled: boolean;
  settings?: Record<string, unknown>;
  timeoutPolicy?: INotificationTimeoutPolicy;
  retryPolicy?: INotificationRetryPolicy;
  rateLimitPolicy?: INotificationRateLimitPolicy;
  fallbackPolicy?: INotificationFallbackPolicy;
  credentials?: {
    credentialRef: string;
  };
  resolvedCredentialFields?: Record<string, string>;
}
