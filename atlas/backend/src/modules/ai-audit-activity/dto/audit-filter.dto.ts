import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsBoolean, IsDateString } from 'class-validator';
import { AiAuditActorType, AiAuditAction, AiAuditOutcome } from '../interfaces';

export class AuditLogFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsEnum(AiAuditActorType)
  @IsOptional()
  actorType?: AiAuditActorType;

  @IsString()
  @IsOptional()
  actorId?: string;

  @IsEnum(AiAuditAction)
  @IsOptional()
  action?: AiAuditAction;

  @IsEnum(AiAuditOutcome)
  @IsOptional()
  outcome?: AiAuditOutcome;

  @IsString()
  @IsOptional()
  capability?: string;

  @IsString()
  @IsOptional()
  useCase?: string;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  agentId?: string;

  @IsString()
  @IsOptional()
  workflowId?: string;

  @IsString()
  @IsOptional()
  orchestratorRequestId?: string;

  @IsString()
  @IsOptional()
  correlationId?: string;

  @IsBoolean()
  @IsOptional()
  suspicious?: boolean;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}
