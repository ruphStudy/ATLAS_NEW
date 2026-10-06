import { IsString, IsNotEmpty, IsOptional, IsNumber, IsObject } from 'class-validator';

export class StartApprovalRequestDto {
  @IsString()
  @IsNotEmpty()
  definitionKey: string;

  @IsString()
  @IsNotEmpty()
  entityType: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  riskLevel?: string;

  @IsString()
  @IsOptional()
  countryCode?: string;

  @IsString()
  @IsOptional()
  marketplaceKey?: string;

  @IsString()
  @IsOptional()
  businessId?: string;

  @IsString()
  @IsOptional()
  organizationId?: string;

  /** Set by `ApprovalStepExecutor` (Enterprise Workflow Engine) when this request is a step of a workflow execution — used to resume/terminate that workflow after the final decision. */
  @IsString()
  @IsOptional()
  sourceWorkflowExecutionId?: string;

  @IsString()
  @IsOptional()
  sourceWorkflowStepExecutionId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
