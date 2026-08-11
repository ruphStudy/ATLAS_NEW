import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';
import { AiWorkflowTriggerType } from '../interfaces';

export class ExecuteWorkflowDto {
  @IsString()
  workspaceId: string;

  @IsString()
  workflowId: string;

  @IsOptional()
  @IsObject()
  input?: unknown;

  @IsOptional()
  @IsEnum(AiWorkflowTriggerType)
  triggerType?: AiWorkflowTriggerType;

  @IsOptional()
  @IsString()
  triggeredBy?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
