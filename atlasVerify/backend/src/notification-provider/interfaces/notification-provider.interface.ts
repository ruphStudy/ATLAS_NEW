import { NotificationProviderChannel } from './notification-provider-channel.enum';
import { INotificationProviderConfig } from './notification-provider-config.interface';
import { INotificationProviderHealth } from './notification-provider-health.interface';
import { INotificationSendRequest, INotificationSendResult } from './notification-request.interface';

export interface INotificationProviderMetadata {
  providerKey: string;
  displayName: string;
  version: string;
  channels: NotificationProviderChannel[];
  capabilities: string[];
}

/**
 * Generic notification provider contract. Every concrete adapter
 * (SendGrid, Twilio, WhatsApp Business, FCM, ...) implements this and
 * registers an instance with `NotificationProviderRegistry` — this
 * foundation layer never references a concrete vendor.
 */
export interface INotificationProvider {
  getMetadata(): INotificationProviderMetadata;
  initialize(config: INotificationProviderConfig): Promise<void>;
  getHealth(): Promise<INotificationProviderHealth>;
  supportsChannel(channel: NotificationProviderChannel): boolean;
  send(request: INotificationSendRequest): Promise<INotificationSendResult>;
}
