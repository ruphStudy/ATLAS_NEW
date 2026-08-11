import { NotificationProviderChannel } from './notification-provider-channel.enum';
import { INotificationProvider } from './notification-provider.interface';
import { INotificationProviderConfig } from './notification-provider-config.interface';

export interface INotificationExecutionCriteria {
  workspaceId: string;
  channel: NotificationProviderChannel;
  preferredProviderKey?: string;
}

export interface INotificationExecutionResolution {
  provider: INotificationProvider;
  providerKey: string;
  config: INotificationProviderConfig;
}

/** Resolves a channel/workspace criteria to a live provider instance + its effective config. */
export type NotificationProviderResolveFn = (
  criteria: INotificationExecutionCriteria,
) => Promise<INotificationExecutionResolution>;
