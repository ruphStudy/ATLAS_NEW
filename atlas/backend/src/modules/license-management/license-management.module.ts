import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { PlanManagementModule } from '@modules/plan-management/plan-management.module';
import { UsageTrackingModule } from '@modules/usage-tracking/usage-tracking.module';
import { RolesPermissionsModule } from '@modules/roles-permissions/roles-permissions.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { LicenseManagementController } from './license-management.controller';
import { LicenseManagementService } from './license-management.service';
import { LicenseManagementRepository } from './license-management.repository';
import { LicenseCredentialEncryptor } from './license-credential.encryptor';
import { LicenseCredentialDecryptor } from './license-credential.decryptor';
import { LicenseManagementEventQueue, LicenseManagementEventWorker } from './jobs';

/**
 * LicenseManagementModule — concrete, issued license grants (org/workspace/
 * user/environment/deployment-scoped) layered on top of Plan Management and
 * Subscription Management, neither of which this module re-implements:
 * entitlements are a CACHED snapshot from `PlanManagementService
 * .getEntitlementSnapshot()`, refreshable but never re-derived. Per-license
 * RSA keypairs (`LicenseCredentialEncryptor` protects the private half at
 * rest, same AES-256-GCM recipe as every other per-module encryptor this
 * session) enable genuine OFFLINE token verification with only the
 * (non-secret) public key — no database access required — alongside the
 * real-time-accurate ONLINE `validateLicense()` path. Activations are
 * counted locally (fast reads) AND delegated to `UsageTrackingService
 * .recordUsage()` for the cross-module ledger, mirroring API Key
 * Management's dual-tracking convention.
 */
@Module({
  imports: [
    DatabaseModule,
    PlanManagementModule,
    UsageTrackingModule,
    RolesPermissionsModule,
    AuditLogsModule,
    TenantIsolationModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.LICENSE_MANAGEMENT_EVENTS,
    }),
  ],
  controllers: [LicenseManagementController],
  providers: [
    LicenseManagementService,
    LicenseManagementRepository,
    LicenseCredentialEncryptor,
    LicenseCredentialDecryptor,
    LicenseManagementEventQueue,
    LicenseManagementEventWorker,
  ],
  exports: [LicenseManagementService],
})
export class LicenseManagementModule {}
