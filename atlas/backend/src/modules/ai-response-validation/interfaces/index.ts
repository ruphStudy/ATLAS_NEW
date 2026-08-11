export enum AiResponseValidationStatus {
  PENDING = 'PENDING',
  VALIDATING = 'VALIDATING',
  VALID = 'VALID',
  INVALID = 'INVALID',
  REPAIRED = 'REPAIRED',
  REJECTED = 'REJECTED',
}

export enum AiResponseValidationType {
  SCHEMA = 'SCHEMA',
  TYPE = 'TYPE',
  FORMAT = 'FORMAT',
  COMPLETENESS = 'COMPLETENESS',
  CONSISTENCY = 'CONSISTENCY',
  BUSINESS_RULE = 'BUSINESS_RULE',
  SAFETY = 'SAFETY',
  CONFIDENCE = 'CONFIDENCE',
}

export enum AiResponseValidationSeverity {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

export enum AiResponseValidationEvent {
  VALIDATION_STARTED = 'ai-response-validation.started',
  VALIDATION_COMPLETED = 'ai-response-validation.completed',
  VALIDATION_FAILED = 'ai-response-validation.failed',
  VALIDATION_REPAIRED = 'ai-response-validation.repaired',
  VALIDATION_REJECTED = 'ai-response-validation.rejected',
  VALIDATOR_EXECUTED = 'ai-response-validation.validator_executed',
}

export interface IAiResponseValidation {
  id: string;
  workspaceId: string;
  status: AiResponseValidationStatus;
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
  responseType: string;
  overallValid: boolean;
  confidenceScore?: number | null;
  qualityScore?: number | null;
  validationConfig?: unknown | null;
  repairAttempted: boolean;
  repairSuccessful?: boolean | null;
  validationStartTime?: Date | null;
  validationEndTime?: Date | null;
  validationDuration?: number | null;
  tags: string[];
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAiResponseValidationResult {
  id: string;
  validationId: string;
  workspaceId: string;
  validationType: AiResponseValidationType;
  validatorName: string;
  isValid: boolean;
  severity: AiResponseValidationSeverity;
  errorCode?: string | null;
  errorMessage?: string | null;
  fieldPath?: string | null;
  expectedValue?: unknown | null;
  actualValue?: unknown | null;
  suggestion?: string | null;
  metadata: unknown;
  createdAt: Date;
}

export interface IAiResponseValidationHistory {
  id: string;
  validationId: string;
  workspaceId: string;
  action: string;
  oldStatus?: string | null;
  newStatus?: string | null;
  details?: string | null;
  performedBy?: string | null;
  metadata: unknown;
  createdAt: Date;
}

export interface IAiValidatorConfig {
  id: string;
  workspaceId?: string | null;
  name: string;
  validationType: string;
  capability?: string | null;
  useCase?: string | null;
  agentType?: string | null;
  modelProvider?: string | null;
  enabled: boolean;
  config: unknown;
  priority: number;
  stopOnFailure: boolean;
  attemptRepair: boolean;
  tags: string[];
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IValidationEventPayload {
  event: AiResponseValidationEvent;
  workspaceId: string;
  validationId: string;
  status?: string;
  overallValid?: boolean;
  metadata?: unknown;
}

export interface IValidateResponseParams {
  workspaceId: string;
  response: unknown;
  responseType: string;
  capability?: string;
  useCase?: string;
  modelProvider?: string;
  modelName?: string;
  orchestratorRequestId?: string;
  agentExecutionId?: string;
  workflowExecutionId?: string;
  contextId?: string;
  validationConfig?: unknown;
}

export interface IValidationResult {
  validationId: string;
  status: AiResponseValidationStatus;
  overallValid: boolean;
  confidenceScore?: number;
  qualityScore?: number;
  validatedResponse?: unknown;
  errors: IValidationError[];
  warnings: IValidationWarning[];
}

export interface IValidationError {
  validationType: AiResponseValidationType;
  validatorName: string;
  errorCode: string;
  errorMessage: string;
  fieldPath?: string;
  expectedValue?: unknown;
  actualValue?: unknown;
  suggestion?: string;
}

export interface IValidationWarning {
  validationType: AiResponseValidationType;
  validatorName: string;
  message: string;
  fieldPath?: string;
  suggestion?: string;
}

export interface IValidator {
  name: string;
  type: AiResponseValidationType;
  validate(response: unknown, config?: unknown): Promise<IValidatorResult>;
  repair?(response: unknown, config?: unknown): Promise<unknown>;
}

export interface IValidatorResult {
  isValid: boolean;
  severity: AiResponseValidationSeverity;
  errorCode?: string;
  errorMessage?: string;
  fieldPath?: string;
  expectedValue?: unknown;
  actualValue?: unknown;
  suggestion?: string;
}
