import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { RolesPermissionsModule } from '@modules/roles-permissions/roles-permissions.module';
import { UsageTrackingModule } from '@modules/usage-tracking/usage-tracking.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { ApiKeyManagementController } from './api-key-management.controller';
import { ApiKeyManagementService } from './api-key-management.service';
import { ApiKeyManagementRepository } from './api-key-management.repository';
import { ApiKeyRateLimiterService } from './api-key-rate-limiter.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { ApiKeyManagementEventQueue, ApiKeyManagementEventWorker } from './jobs';

/**
 * ApiKeyManagementModule — secure API key issuance/rotation/revocation for
 * organization/workspace/user/service-account scoped programmatic access.
 * Only a SHA-256 hash of each secret is ever stored (`ApiKey.secretHash`);
 * the plaintext key is generated at create/rotate time, returned exactly
 * once in the response, and never persisted, logged or returned again.
 * Successful validations record a usage tick directly on the key AND
 * delegate to `UsageTrackingService.recordUsage()` — never a second,
 * parallel usage ledger. `ApiKeyGuard`/`CurrentApiKey` are exported so
 * other modules can opt a `@Public()` route into API-key authentication
 * without touching the global JWT guard.
 */
@Module({
  imports: [
    DatabaseModule,
    RolesPermissionsModule,
    UsageTrackingModule,
    AuditLogsModule,
    TenantIsolationModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.API_KEY_MANAGEMENT_EVENTS,
    }),
  ],
  controllers: [ApiKeyManagementController],
  providers: [
    ApiKeyManagementService,
    ApiKeyManagementRepository,
    ApiKeyRateLimiterService,
    ApiKeyGuard,
    ApiKeyManagementEventQueue,
    ApiKeyManagementEventWorker,
  ],
  exports: [ApiKeyManagementService, ApiKeyGuard],
})
export class ApiKeyManagementModule {}
