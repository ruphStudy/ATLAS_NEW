import { Injectable, Logger } from '@nestjs/common';
import { EnterpriseWorkflowEngineRepository } from '../enterprise-workflow-engine.repository';
import { IWorkflowDefinition } from '../interfaces';

/**
 * EnterpriseWorkflowEngineAudit
 *
 * Writes version/publish/lifecycle snapshots to the append-only
 * `WorkflowDefinitionHistory` table, mirroring the versioned-history
 * pattern used across every framework module this session. Cross-cutting
 * compliance entries for workspace-scoped actions are written separately
 * by `EnterpriseWorkflowEngineService` to the central `AuditLogsService`.
 */
@Injectable()
export class EnterpriseWorkflowEngineAudit {
  private readonly logger = new Logger(EnterpriseWorkflowEngineAudit.name);

  constructor(private readonly repository: EnterpriseWorkflowEngineRepository) {}

  async logDefinitionChange(definition: IWorkflowDefinition, changeReason: string, changedBy?: string): Promise<void> {
    try {
      const { id, version, status, deletedAt, createdBy, updatedBy, ...rest } = definition;
      await this.repository.createDefinitionHistory({
        definitionId: id,
        version,
        status,
        snapshot: rest as unknown as Record<string, unknown>,
        changeReason,
        changedBy: changedBy ?? null,
      });
    } catch (err) {
      this.logger.warn(`Audit log write failed for workflow definition '${definition.key}': ${(err as Error).message}`);
    }
  }
}
