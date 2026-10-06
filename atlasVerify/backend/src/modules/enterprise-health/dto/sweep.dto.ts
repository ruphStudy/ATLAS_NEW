import { IsString, IsOptional } from 'class-validator';

/**
 * Enterprise Workflow integration is entirely configuration-driven: the
 * caller (an enterprise admin invoking the sweep, or a scheduled job
 * configured externally) supplies which already-published Enterprise
 * Workflow Engine definition should run for a newly opened CRITICAL
 * incident — nothing here is hardcoded to a specific workflow.
 */
export class RunEnterpriseHealthSweepDto {
  @IsString()
  @IsOptional()
  criticalIncidentWorkflowDefinitionId?: string;
}
