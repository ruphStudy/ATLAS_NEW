export class DrPolicyResponseDto {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  environment: string;
  criticalService: string;
  rpoMinutes: number;
  rtoMinutes: number;
  recoveryPriority: number;
  coverageTargets: string[];
  dependencyOrder: string[];
  regionFailoverConfig?: unknown;
  autoTriggerOnDetection: boolean;
  version: number;
  status: string;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;

  static from(raw: Record<string, unknown>): DrPolicyResponseDto {
    const dto = new DrPolicyResponseDto();
    Object.assign(dto, raw);
    return dto;
  }
}

export class PaginatedDrPolicyResponseDto {
  data: DrPolicyResponseDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;

  static from(items: Record<string, unknown>[], total: number, page: number, limit: number): PaginatedDrPolicyResponseDto {
    const dto = new PaginatedDrPolicyResponseDto();
    dto.data = items.map((i) => DrPolicyResponseDto.from(i));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.hasMore = page * limit < total;
    return dto;
  }
}

export class DrPolicyHistoryResponseDto {
  id: string;
  policyId: string;
  version: number;
  status: string;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;

  static from(raw: Record<string, unknown>): DrPolicyHistoryResponseDto {
    const dto = new DrPolicyHistoryResponseDto();
    Object.assign(dto, raw);
    return dto;
  }
}

export class DrRecoveryPlanResponseDto {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  policyId?: string | null;
  key: string;
  name: string;
  description?: string | null;
  scope: string;
  targets: string[];
  workflowDefinitionId: string;
  requiresApproval: boolean;
  approvalDefinitionKey?: string | null;
  isTemplate: boolean;
  dryRunDefault: boolean;
  version: number;
  status: string;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;

  static from(raw: Record<string, unknown>): DrRecoveryPlanResponseDto {
    const dto = new DrRecoveryPlanResponseDto();
    Object.assign(dto, raw);
    return dto;
  }
}

export class PaginatedDrRecoveryPlanResponseDto {
  data: DrRecoveryPlanResponseDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;

  static from(items: Record<string, unknown>[], total: number, page: number, limit: number): PaginatedDrRecoveryPlanResponseDto {
    const dto = new PaginatedDrRecoveryPlanResponseDto();
    dto.data = items.map((i) => DrRecoveryPlanResponseDto.from(i));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.hasMore = page * limit < total;
    return dto;
  }
}

export class DrRecoveryCheckpointResponseDto {
  id: string;
  executionId: string;
  sequence: number;
  targetType: string;
  status: string;
  backupRecordId?: string | null;
  notes?: string | null;
  createdAt: Date;

  static from(raw: Record<string, unknown>): DrRecoveryCheckpointResponseDto {
    const dto = new DrRecoveryCheckpointResponseDto();
    Object.assign(dto, raw);
    return dto;
  }
}

export class DrRecoveryExecutionResponseDto {
  id: string;
  workspaceId?: string | null;
  planId: string;
  policyId?: string | null;
  scope: string;
  status: string;
  isDryRun: boolean;
  triggerType: string;
  triggeredBy?: string | null;
  targetWorkspaceIds: string[];
  approvalRequestId?: string | null;
  workflowExecutionId?: string | null;
  currentCheckpointSequence: number;
  rpoActualMinutes?: number | null;
  rtoActualMinutes?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  startedAt: Date;
  endedAt?: Date | null;
  checkpoints?: DrRecoveryCheckpointResponseDto[];

  static from(raw: Record<string, unknown>): DrRecoveryExecutionResponseDto {
    const dto = new DrRecoveryExecutionResponseDto();
    const { checkpoints, ...rest } = raw;
    Object.assign(dto, rest);
    if (Array.isArray(checkpoints)) {
      dto.checkpoints = (checkpoints as Record<string, unknown>[]).map((c) => DrRecoveryCheckpointResponseDto.from(c));
    }
    return dto;
  }
}

export class PaginatedDrRecoveryExecutionResponseDto {
  data: DrRecoveryExecutionResponseDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;

  static from(items: Record<string, unknown>[], total: number, page: number, limit: number): PaginatedDrRecoveryExecutionResponseDto {
    const dto = new PaginatedDrRecoveryExecutionResponseDto();
    dto.data = items.map((i) => DrRecoveryExecutionResponseDto.from(i));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.hasMore = page * limit < total;
    return dto;
  }
}
