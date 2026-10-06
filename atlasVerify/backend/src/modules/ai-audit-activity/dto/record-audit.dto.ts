import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsBoolean, IsArray, IsObject } from 'class-validator';
import { AiAuditActorType, AiAuditAction, AiAuditOutcome } from '../interfaces';

export class RecordAuditDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsEnum(AiAuditActorType)
  @IsNotEmpty()
  actorType: AiAuditActorType;

  @IsString()
  @IsOptional()
  actorId?: string;

  @IsString()
  @IsOptional()
  actorName?: string;

  @IsEnum(AiAuditAction)
  @IsNotEmpty()
  action: AiAuditAction;

  @IsEnum(AiAuditOutcome)
  @IsNotEmpty()
  outcome: AiAuditOutcome;

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
  agentExecutionId?: string;

  @IsString()
  @IsOptional()
  workflowId?: string;

  @IsString()
  @IsOptional()
  workflowExecutionId?: string;

  @IsString()
  @IsOptional()
  jobId?: string;

  @IsString()
  @IsOptional()
  jobExecutionId?: string;

  @IsString()
  @IsOptional()
  queueJobId?: string;

  @IsString()
  @IsOptional()
  orchestratorRequestId?: string;

  @IsString()
  @IsOptional()
  correlationId?: string;

  @IsString()
  @IsOptional()
  externalReferenceId?: string;

  @IsNumber()
  @IsOptional()
  inputTokens?: number;

  @IsNumber()
  @IsOptional()
  outputTokens?: number;

  @IsNumber()
  @IsOptional()
  totalTokens?: number;

  @IsNumber()
  @IsOptional()
  cost?: number;

  @IsNumber()
  @IsOptional()
  latencyMs?: number;

  @IsString()
  @IsOptional()
  validationResult?: string;

  @IsString()
  @IsOptional()
  guardrailDecision?: string;

  @IsArray()
  @IsOptional()
  guardrailReasons?: string[];

  @IsString()
  @IsOptional()
  inputReference?: string;

  @IsString()
  @IsOptional()
  outputReference?: string;

  @IsString()
  @IsOptional()
  errorCode?: string;

  @IsString()
  @IsOptional()
  errorMessage?: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
