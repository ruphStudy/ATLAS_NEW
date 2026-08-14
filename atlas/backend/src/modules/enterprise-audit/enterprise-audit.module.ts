import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { SaasAuditModule } from '@modules/saas-audit/saas-audit.module';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { RolesPermissionsModule } from '@modules/roles-permissions/roles-permissions.module';
import { EnterpriseAuditController } from './enterprise-audit.controller';
import { EnterpriseAuditService } from './enterprise-audit.service';
import { EnterpriseAuditValidator } from './enterprise-audit.validator';
import { EnterpriseAuditEventQueue, EnterpriseAuditEventWorker } from './jobs';

/**
 * EnterpriseAuditModule
 *
 * The organization-admin, cross-business/cross-workspace-within-one-
 * organization audit surface — the tenant-side counterpart to SaaS
 * Audit's platform-staff surface. Owns no audit storage or detection
 * logic of its own and creates no new tables: `AuditLogEntry` (Audit
 * Logs) stays the one central, immutable trail every module writes to
 * (extended additively with `businessId`/`traceId` dimensional tags and
 * `integrityHash`/`previousHash` tamper-evidence chaining, computed once
 * in `AuditLogsService.record()`), and `SaasSecurityIncident` (SaaS
 * Audit, extended with a `POLICY_VIOLATION` incident type and an
 * additional scan inside its existing `runDetectionSweep()`) stays the
 * one reviewable incident workflow. This module only adds the
 * organization-boundary-checked, permission-gated gateway to both,
 * plus the org-scoped policy-violation sweep loop.
 */
@Module({
  imports: [
    AuditLogsModule,
    SaasAuditModule,
    WorkspaceModule,
    TenantIsolationModule,
    RolesPermissionsModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.ENTERPRISE_AUDIT_EVENTS }),
  ],
  controllers: [EnterpriseAuditController],
  providers: [EnterpriseAuditService, EnterpriseAuditValidator, EnterpriseAuditEventQueue, EnterpriseAuditEventWorker],
  exports: [EnterpriseAuditService],
})
export class EnterpriseAuditModule {}
