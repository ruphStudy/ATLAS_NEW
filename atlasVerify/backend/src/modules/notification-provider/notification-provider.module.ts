import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { NotificationProviderFoundationModule } from '../../notification-provider/notification-provider-foundation.module';

import { NotificationProviderRegistryController } from './registry/notification-provider-registry.controller';
import { NotificationProviderRegistryService } from './registry/notification-provider-registry.service';
import { NotificationProviderRegistryRepository } from './registry/notification-provider-registry.repository';

import { NotificationProviderConfigurationController } from './configuration/notification-provider-configuration.controller';
import { NotificationProviderConfigurationService } from './configuration/notification-provider-configuration.service';
import { NotificationProviderConfigurationRepository } from './configuration/notification-provider-configuration.repository';

import { NotificationProviderCredentialController } from './credentials/notification-provider-credential.controller';
import { NotificationProviderCredentialService } from './credentials/notification-provider-credential.service';
import { NotificationProviderCredentialRepository } from './credentials/notification-provider-credential.repository';
import { NotificationProviderCredentialEncryptor } from './credentials/notification-provider-credential.encryptor';
import { NotificationProviderCredentialDecryptor } from './credentials/notification-provider-credential.decryptor';

import { NotificationDeliveryController } from './delivery/notification-delivery.controller';
import { NotificationDeliveryService } from './delivery/notification-delivery.service';
import { NotificationDeliveryRepository } from './delivery/notification-delivery.repository';

import { NotificationProviderEventQueue, NotificationProviderEventWorker } from './jobs';

import { EmailProviderAdapter } from './adapters/email/email-provider.adapter';
import { EmailTemplateRenderer } from './adapters/email/email-template.renderer';

import { SmsProviderAdapter } from './adapters/sms/sms-provider.adapter';
import { SmsTemplateRenderer } from './adapters/sms/sms-template.renderer';
import { SmsWebhookController } from './adapters/sms/sms-webhook.controller';
import { SmsWebhookService } from './adapters/sms/sms-webhook.service';
import { WebhookSignatureVerifier } from '@modules/marketplace-webhook/signature/webhook-signature-verifier';

import { WhatsAppProviderAdapter } from './adapters/whatsapp/whatsapp-provider.adapter';
import { WhatsAppTemplateRenderer } from './adapters/whatsapp/whatsapp-template.renderer';
import { WhatsAppWebhookController } from './adapters/whatsapp/whatsapp-webhook.controller';
import { WhatsAppWebhookService } from './adapters/whatsapp/whatsapp-webhook.service';

import { PushProviderAdapter } from './adapters/push/push-provider.adapter';
import { PushDeviceTokenController } from './adapters/push/push-device-token.controller';
import { PushDeviceTokenService } from './adapters/push/push-device-token.service';
import { PushDeviceTokenRepository } from './adapters/push/push-device-token.repository';
import { PushSendController } from './adapters/push/push-send.controller';
import { PushSendService } from './adapters/push/push-send.service';
import { PushWebhookController } from './adapters/push/push-webhook.controller';
import { PushWebhookService } from './adapters/push/push-webhook.service';

/**
 * NotificationProviderModule — Notification Provider Framework
 *
 * Persisted, workspace-scoped orchestration layer on top of
 * `NotificationProviderFoundationModule`: a catalog of available channel
 * adapters (registry), per-workspace configuration (versioned, effective
 * dates, priority/fallback), encrypted per-workspace credentials, and the
 * send/delivery ledger. Mirrors the AI Provider Foundation's
 * registry/configuration/credentials/factory module split, consolidated
 * into one NestJS module with per-concern controllers.
 *
 * `EmailProviderAdapter`, `SmsProviderAdapter`, `WhatsAppProviderAdapter`
 * and `PushProviderAdapter` are the concrete channel adapters registered —
 * generic, configuration-driven implementations. `SmsWebhookController`/
 * `WhatsAppWebhookController`/`PushWebhookController` (+ their services)
 * handle inbound async delivery-receipt/status/interaction callbacks,
 * reusing `WebhookSignatureVerifier` from marketplace-webhook for HMAC
 * verification. `PushDeviceTokenController`/`PushSendController` add push's
 * device-token registry and device/user/topic/segment/platform target
 * resolution, delegating the actual send to the shared
 * `NotificationDeliveryService`.
 */
@Module({
  imports: [
    DatabaseModule,
    NotificationProviderFoundationModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.NOTIFICATION_PROVIDER_EVENTS,
    }),
  ],
  controllers: [
    NotificationProviderRegistryController,
    NotificationProviderConfigurationController,
    NotificationProviderCredentialController,
    NotificationDeliveryController,
    SmsWebhookController,
    WhatsAppWebhookController,
    PushDeviceTokenController,
    PushSendController,
    PushWebhookController,
  ],
  providers: [
    NotificationProviderRegistryRepository,
    NotificationProviderRegistryService,
    NotificationProviderConfigurationRepository,
    NotificationProviderConfigurationService,
    NotificationProviderCredentialRepository,
    NotificationProviderCredentialEncryptor,
    NotificationProviderCredentialDecryptor,
    NotificationProviderCredentialService,
    NotificationDeliveryRepository,
    NotificationDeliveryService,
    NotificationProviderEventQueue,
    NotificationProviderEventWorker,
    EmailTemplateRenderer,
    EmailProviderAdapter,
    SmsTemplateRenderer,
    SmsProviderAdapter,
    SmsWebhookService,
    WebhookSignatureVerifier,
    WhatsAppTemplateRenderer,
    WhatsAppProviderAdapter,
    WhatsAppWebhookService,
    PushDeviceTokenRepository,
    PushDeviceTokenService,
    PushProviderAdapter,
    PushSendService,
    PushWebhookService,
  ],
  exports: [
    NotificationProviderRegistryService,
    NotificationProviderConfigurationService,
    NotificationProviderCredentialService,
    NotificationDeliveryService,
  ],
})
export class NotificationProviderModule {}
