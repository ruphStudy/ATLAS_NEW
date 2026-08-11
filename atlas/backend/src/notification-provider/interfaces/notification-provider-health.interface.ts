export enum NotificationProviderHealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  UNKNOWN = 'UNKNOWN',
}

export enum NotificationProviderLifecycleStatus {
  UNINITIALIZED = 'UNINITIALIZED',
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  DEGRADED = 'DEGRADED',
  UNAVAILABLE = 'UNAVAILABLE',
  DISABLED = 'DISABLED',
}

export interface INotificationProviderHealth {
  providerKey: string;
  status: NotificationProviderHealthStatus;
  lifecycleStatus: NotificationProviderLifecycleStatus;
  lastCheckedAt: Date;
  latencyMs?: number;
  message?: string;
}
