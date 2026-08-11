import { NotificationProviderChannel } from './notification-provider-channel.enum';
import { NotificationDeliveryStatus } from './notification-delivery-status.enum';

export type NotificationSendPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface INotificationRecipient {
  address: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface INotificationAttachment {
  filename: string;
  contentType: string;
  url?: string;
  contentBase64?: string;
  sizeBytes?: number;
}

export interface INotificationTemplate {
  templateId: string;
  variables?: Record<string, unknown>;
}

/**
 * Standard request every provider adapter's `send()` receives. Never carries
 * credential material — that is resolved and injected into the adapter at
 * `initialize()` time and lives only inside the adapter instance.
 */
export interface INotificationSendRequest {
  workspaceId: string;
  channel: NotificationProviderChannel;
  recipients: INotificationRecipient[];
  subject?: string;
  body?: string;
  template?: INotificationTemplate;
  attachments?: INotificationAttachment[];
  idempotencyKey?: string;
  priority?: NotificationSendPriority;
  scheduledAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface INotificationSendError {
  code: string;
  message: string;
  recipient?: string;
  retryable: boolean;
}

/** Standard, provider-agnostic response shape every adapter must normalize its result into. */
export interface INotificationSendResult {
  providerKey: string;
  channel: NotificationProviderChannel;
  status: NotificationDeliveryStatus;
  providerRef?: string;
  deliveredCount: number;
  failedCount: number;
  errors?: INotificationSendError[];
  latencyMs?: number;
  metadata?: Record<string, unknown>;
}
