import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { RolesPermissionsModule } from '@modules/roles-permissions/roles-permissions.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { WebhookFrameworkController } from './webhook-framework.controller';
import { WebhookFrameworkService } from './webhook-framework.service';
import { WebhookFrameworkRepository } from './webhook-framework.repository';
import { WebhookCredentialEncryptor } from './webhook-credential.encryptor';
import { WebhookCredentialDecryptor } from './webhook-credential.decryptor';
import { WebhookFrameworkEventQueue, WebhookFrameworkEventWorker, WebhookDeliveryQueue, WebhookDeliveryWorker } from './jobs';

/**
 * WebhookFrameworkModule — ATLAS's own outbound/integration webhooks
 * (organization/workspace-scoped subscriber endpoints), distinct from the
 * inbound provider webhook processing in `payment-provider`/`marketplace-webhook`.
 * Signing secrets are AES-256-GCM encrypted (never hashed, since the raw
 * value must be recovered to compute each outgoing HMAC) and are only ever
 * returned in plaintext once, at creation/rotation time.
 * `WebhookFrameworkService.dispatchEvent()` is exported so other modules
 * can fan an internal event out to subscribers without duplicating any of
 * this module's signing/retry/dead-letter machinery.
 */
@Module({
  imports: [
    DatabaseModule,
    RolesPermissionsModule,
    AuditLogsModule,
    TenantIsolationModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.WEBHOOK_FRAMEWORK_EVENTS,
    }),
    BullModule.registerQueue({
      name: QUEUE_NAMES.WEBHOOK_DELIVERY,
    }),
  ],
  controllers: [WebhookFrameworkController],
  providers: [
    WebhookFrameworkService,
    WebhookFrameworkRepository,
    WebhookCredentialEncryptor,
    WebhookCredentialDecryptor,
    WebhookFrameworkEventQueue,
    WebhookFrameworkEventWorker,
    WebhookDeliveryQueue,
    WebhookDeliveryWorker,
  ],
  exports: [WebhookFrameworkService],
})
export class WebhookFrameworkModule {}
