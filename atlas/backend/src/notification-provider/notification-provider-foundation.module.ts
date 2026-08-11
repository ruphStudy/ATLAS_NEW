import { Module } from '@nestjs/common';
import { NotificationProviderEventEmitter } from './events/notification-provider-event.emitter';
import { NotificationProviderRegistry } from './registry/notification-provider.registry';
import { NotificationProviderRateLimiter } from './execution/notification-provider-rate-limiter';
import { NotificationProviderHealthService } from './health/notification-provider-health.service';
import { NotificationProviderExecutor } from './execution/notification-provider.executor';

/**
 * NotificationProviderFoundationModule
 *
 * Generic, channel/vendor-independent contract layer for notification
 * providers — mirrors src/ai/ai.module.ts ("AI Provider Foundation").
 * Business modules depend on `INotificationProvider`/the registry/executor
 * here — never on a concrete channel SDK. No concrete adapters (SendGrid,
 * Twilio, FCM, ...) are registered by this module; that is left entirely
 * to whoever wires a real channel integration in later.
 */
@Module({
  providers: [
    NotificationProviderEventEmitter,
    NotificationProviderRegistry,
    NotificationProviderRateLimiter,
    NotificationProviderHealthService,
    NotificationProviderExecutor,
  ],
  exports: [
    NotificationProviderEventEmitter,
    NotificationProviderRegistry,
    NotificationProviderRateLimiter,
    NotificationProviderHealthService,
    NotificationProviderExecutor,
  ],
})
export class NotificationProviderFoundationModule {}
