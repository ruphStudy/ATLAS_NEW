import {
  AiResponseValidationStatus,
  AiResponseValidationType,
  AiResponseValidationSeverity,
} from '../interfaces';

export class ValidationResponseDto {
  id!: string;
  workspaceId!: string;
  status!: AiResponseValidationStatus;
  orchestratorRequestId?: string | null;
  agentExecutionId?: string | null;
  workflowExecutionId?: string | null;
  contextId?: string | null;
  capability?: string | null;
  useCase?: string | null;
  modelProvider?: string | null;
  modelName?: string | null;
  originalResponse: unknown;
  validatedResponse?: unknown | null;
  responseType!: string;
  overallValid!: boolean;
  confidenceScore?: number | null;
  qualityScore?: number | null;
  validationConfig?: unknown | null;
  repairAttempted!: boolean;
  repairSuccessful?: boolean | null;
  validationStartTime?: Date | null;
  validationEndTime?: Date | null;
  validationDuration?: number | null;
  tags!: string[];
  metadata: unknown;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedValidationResponseDto {
  data!: ValidationResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class ValidationResultDto {
  validationId!: string;
  status!: AiResponseValidationStatus;
  overallValid!: boolean;
  confidenceScore?: number;
  qualityScore?: number;
  validatedResponse?: unknown;
  errors!: ValidationErrorDto[];
  warnings!: ValidationWarningDto[];
}

export class ValidationErrorDto {
  validationType!: AiResponseValidationType;
  validatorName!: string;
  errorCode!: string;
  errorMessage!: string;
  fieldPath?: string;
  expectedValue?: unknown;
  actualValue?: unknown;
  suggestion?: string;
}

export class ValidationWarningDto {
  validationType!: AiResponseValidationType;
  validatorName!: string;
  message!: string;
  fieldPath?: string;
  suggestion?: string;
}

export class ValidatorConfigResponseDto {
  id!: string;
  workspaceId?: string | null;
  name!: string;
  validationType!: string;
  capability?: string | null;
  useCase?: string | null;
  agentType?: string | null;
  modelProvider?: string | null;
  enabled!: boolean;
  config: unknown;
  priority!: number;
  stopOnFailure!: boolean;
  attemptRepair!: boolean;
  tags!: string[];
  metadata: unknown;
  createdAt!: Date;
  updatedAt!: Date;
}
