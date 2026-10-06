import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { AppStoreModule } from '@modules/app-store/app-store.module';
import { WebhookFrameworkModule } from '@modules/webhook-framework/webhook-framework.module';
import { RolesPermissionsModule } from '@modules/roles-permissions/roles-permissions.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { PluginFrameworkController } from './plugin-framework.controller';
import { PluginFrameworkService } from './plugin-framework.service';
import { PluginFrameworkRepository } from './plugin-framework.repository';
import { PluginFrameworkEventQueue, PluginFrameworkEventWorker } from './jobs';

/**
 * PluginFrameworkModule — the governance layer over App Store installations:
 * manifests (the structured technical contract per app version), per-tenant
 * activations (permission grants, compatibility, failure isolation/
 * quarantine), extension points and event subscriptions. Deliberately owns
 * no installation/entitlement/billing logic itself — every manifest and
 * activation is anchored to an already-installed `AppInstallation` from
 * `AppStoreModule`, reusing its visibility and installation lookups rather
 * than duplicating them. There is no bespoke outbound delivery mechanism
 * either: `triggerHook()` fans a plugin hook invocation out entirely
 * through `WebhookFrameworkService.dispatchEvent()`, so retry/backoff/
 * dead-letter handling stays owned by Webhook Framework alone. "Sandboxed
 * execution" here is a governance boundary, not a code sandbox — a
 * QUARANTINED activation simply stops being dispatched to.
 */
@Module({
  imports: [
    DatabaseModule,
    AppStoreModule,
    WebhookFrameworkModule,
    RolesPermissionsModule,
    AuditLogsModule,
    TenantIsolationModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.PLUGIN_FRAMEWORK_EVENTS,
    }),
  ],
  controllers: [PluginFrameworkController],
  providers: [PluginFrameworkService, PluginFrameworkRepository, PluginFrameworkEventQueue, PluginFrameworkEventWorker],
  exports: [PluginFrameworkService],
})
export class PluginFrameworkModule {}
