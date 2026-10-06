export enum NotificationProviderEventType {
  PROVIDER_REGISTERED = 'notification-provider.provider_registered',
  PROVIDER_UNREGISTERED = 'notification-provider.provider_unregistered',
  PROVIDER_HEALTH_CHANGED = 'notification-provider.provider_health_changed',
  PROVIDER_RATE_LIMITED = 'notification-provider.provider_rate_limited',
  PROVIDER_REQUEST_STARTED = 'notification-provider.provider_request_started',
  PROVIDER_REQUEST_COMPLETED = 'notification-provider.provider_request_completed',
  PROVIDER_REQUEST_FAILED = 'notification-provider.provider_request_failed',
  PROVIDER_REQUEST_RETRIED = 'notification-provider.provider_request_retried',
  PROVIDER_FALLBACK_TRIGGERED = 'notification-provider.provider_fallback_triggered',
}

export interface INotificationProviderEvent<TPayload = Record<string, unknown>> {
  type: NotificationProviderEventType;
  providerKey: string;
  workspaceId?: string;
  occurredAt: Date;
  payload?: TPayload;
}
