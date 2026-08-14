import { IsArray, IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import {
  IWorkflowDefinition,
  IWorkflowDefinitionHistory,
  IWorkflowExecution,
  IWorkflowStepExecution,
  WorkflowDefinitionStatus,
  WorkflowExecutionStatus,
  WorkflowKind,
  WorkflowStepStatus,
  WorkflowTriggerType,
} from '../interfaces';

// ── Definition ───────────────────────────────────────────────────

export class CreateWorkflowDefinitionDto {
  @IsString()
  key!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(WorkflowKind)
  workflowKind?: WorkflowKind;

  @IsOptional()
  @IsEnum(WorkflowTriggerType)
  triggerType?: WorkflowTriggerType;

  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, unknown>;

  /** Array of `IWorkflowStageDefinition` — validated structurally by `WorkflowDefinitionValidator`, not by class-validator, since stage/step shape is inherently configuration-driven. */
  @IsArray()
  stages!: unknown[];

  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  slaMs?: number;

  @IsOptional()
  @IsObject()
  escalationConfig?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxRetries?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  timeoutMs?: number;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @IsOptional()
  @IsString()
  templateKey?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  businessId?: string;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;
}

export class UpdateWorkflowDefinitionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(WorkflowKind)
  workflowKind?: WorkflowKind;

  @IsOptional()
  @IsEnum(WorkflowTriggerType)
  triggerType?: WorkflowTriggerType;

  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  stages?: unknown[];

  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  slaMs?: number;

  @IsOptional()
  @IsObject()
  escalationConfig?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxRetries?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  timeoutMs?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  changeReason?: string;
}

export class WorkflowDefinitionFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsEnum(WorkflowDefinitionStatus)
  status?: WorkflowDefinitionStatus;

  @IsOptional()
  @IsEnum(WorkflowKind)
  workflowKind?: WorkflowKind;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}

// ── Execution ────────────────────────────────────────────────────

export class ExecuteWorkflowDto {
  @IsString()
  definitionId!: string;

  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(WorkflowTriggerType)
  triggerType?: WorkflowTriggerType;

  @IsOptional()
  @IsString()
  triggeredBy?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ResumeStepExecutionDto {
  @IsEnum(WorkflowStepStatus)
  status!: WorkflowStepStatus.COMPLETED | WorkflowStepStatus.FAILED;

  @IsOptional()
  @IsObject()
  output?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  errorMessage?: string;
}

export class ReassignStepDto {
  @IsString()
  assignedTo!: string;
}

export class WorkflowActionReasonDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class WorkflowExecutionFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  definitionId?: string;

  @IsOptional()
  @IsEnum(WorkflowExecutionStatus)
  status?: WorkflowExecutionStatus;
}

// ── Response DTOs ──────────────────────────────────────────────

export class WorkflowDefinitionResponseDto {
  id!: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  businessId?: string | null;
  key!: string;
  name!: string;
  description?: string | null;
  version!: number;
  status!: WorkflowDefinitionStatus;
  workflowKind!: WorkflowKind;
  triggerType!: WorkflowTriggerType;
  triggerConfig!: Record<string, unknown>;
  stages!: unknown[];
  variables!: Record<string, unknown>;
  slaMs?: number | null;
  escalationConfig?: Record<string, unknown> | null;
  maxRetries!: number;
  timeoutMs?: number | null;
  isTemplate!: boolean;
  templateKey?: string | null;
  supersedesId?: string | null;
  tags!: string[];
  metadata!: Record<string, unknown>;
  publishedAt?: Date | null;
  publishedBy?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): WorkflowDefinitionResponseDto {
    const dto = new WorkflowDefinitionResponseDto();
    Object.assign(dto, raw);
    return dto;
  }
}

export class PaginatedWorkflowDefinitionResponseDto {
  data!: WorkflowDefinitionResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  hasMore!: boolean;

  static from(items: Record<string, unknown>[], total: number, page: number, limit: number): PaginatedWorkflowDefinitionResponseDto {
    const dto = new PaginatedWorkflowDefinitionResponseDto();
    dto.data = items.map((i) => WorkflowDefinitionResponseDto.from(i));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.hasMore = page * limit < total;
    return dto;
  }
}

export class WorkflowDefinitionHistoryResponseDto {
  id!: string;
  definitionId!: string;
  version!: number;
  status!: WorkflowDefinitionStatus;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt!: Date;

  static from(entry: IWorkflowDefinitionHistory): WorkflowDefinitionHistoryResponseDto {
    const dto = new WorkflowDefinitionHistoryResponseDto();
    dto.id = entry.id;
    dto.definitionId = entry.definitionId;
    dto.version = entry.version;
    dto.status = entry.status;
    dto.changeReason = entry.changeReason;
    dto.changedBy = entry.changedBy;
    dto.createdAt = entry.createdAt;
    return dto;
  }
}

export class WorkflowStepExecutionResponseDto {
  id!: string;
  executionId!: string;
  stageId!: string;
  stepId!: string;
  stepIndex!: number;
  stepType!: string;
  status!: WorkflowStepStatus;
  output?: Record<string, unknown> | null;
  startTime!: Date;
  endTime?: Date | null;
  attemptNumber!: number;
  dueAt?: Date | null;
  assignedTo?: string | null;
  externalRef?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;

  static from(raw: Record<string, unknown>): WorkflowStepExecutionResponseDto {
    const dto = new WorkflowStepExecutionResponseDto();
    Object.assign(dto, raw);
    return dto;
  }
}

export class WorkflowExecutionResponseDto {
  id!: string;
  workspaceId!: string;
  businessId?: string | null;
  definitionId!: string;
  definitionVersion!: number;
  status!: WorkflowExecutionStatus;
  triggerType!: WorkflowTriggerType;
  triggeredBy?: string | null;
  idempotencyKey?: string | null;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  variables!: Record<string, unknown>;
  currentStageIndex?: number | null;
  currentStepId?: string | null;
  startTime!: Date;
  endTime?: Date | null;
  attemptNumber!: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  compensationExecuted!: boolean;
  stepExecutions?: WorkflowStepExecutionResponseDto[];

  static from(raw: Record<string, unknown>): WorkflowExecutionResponseDto {
    const dto = new WorkflowExecutionResponseDto();
    const { stepExecutions, ...rest } = raw;
    Object.assign(dto, rest);
    if (Array.isArray(stepExecutions)) {
      dto.stepExecutions = (stepExecutions as Record<string, unknown>[]).map((s) => WorkflowStepExecutionResponseDto.from(s));
    }
    return dto;
  }
}

export class PaginatedWorkflowExecutionResponseDto {
  data!: WorkflowExecutionResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  hasMore!: boolean;

  static from(items: Record<string, unknown>[], total: number, page: number, limit: number): PaginatedWorkflowExecutionResponseDto {
    const dto = new PaginatedWorkflowExecutionResponseDto();
    dto.data = items.map((i) => WorkflowExecutionResponseDto.from(i));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.hasMore = page * limit < total;
    return dto;
  }
}
