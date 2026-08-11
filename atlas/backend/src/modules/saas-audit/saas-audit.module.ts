import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { SaasAdministrationModule } from '@modules/saas-administration/saas-administration.module';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { StorageModule } from '../../storage/storage.module';
import { SaasAuditController } from './saas-audit.controller';
import { SaasAuditService } from './saas-audit.service';
import { SaasAuditRepository } from './saas-audit.repository';
import { SaasAuditEventQueue, SaasAuditEventWorker } from './jobs';

/**
 * SaasAuditModule — the platform-admin, cross-tenant security surface built
 * entirely on top of ATLAS's already-existing audit infrastructure. Owns no
 * general-purpose audit writing: `AuditLogsModule`'s `AuditLogEntry` stays
 * the one central, immutable trail every module writes to, and
 * `SaasAdministrationModule`'s `AdminActionLog`/`ImpersonationSession` stay
 * the authoritative cross-tenant admin-action/impersonation ledgers (see
 * `AuditLogsRepository.findAllPlatformWide` and
 * `SaasAdministrationService.listImpersonationSessions` — small,
 * additive extensions to those modules' existing exported services/
 * repositories, added alongside this module rather than duplicated inside
 * it). This module owns exactly two new concerns neither of those already
 * covers: a reviewable `SaasSecurityIncident` workflow for rule-based
 * privilege-escalation/destructive-action/repeated-failure/cross-tenant-
 * access detection, and genuine cold-storage archival (`SaasAuditArchive`)
 * via the shared, provider-agnostic `StorageModule` — as opposed to Audit
 * Logs' own retention purge, which only ever deletes. Every route is gated
 * by `PlatformAdminGuard`, never `TenantIsolationGuard` — this is
 * deliberately NOT a per-tenant view.
 */
@Module({
  imports: [
    DatabaseModule,
    AuditLogsModule,
    SaasAdministrationModule,
    WorkspaceModule,
    TenantIsolationModule,
    StorageModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.SAAS_AUDIT_EVENTS,
    }),
  ],
  controllers: [SaasAuditController],
  providers: [SaasAuditService, SaasAuditRepository, SaasAuditEventQueue, SaasAuditEventWorker],
  exports: [SaasAuditService],
})
export class SaasAuditModule {}
