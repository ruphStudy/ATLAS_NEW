import { Injectable, Logger } from '@nestjs/common';
import { AiResponseValidationRepository } from './ai-response-validation.repository';
import { AiValidationEventQueue } from './jobs';
import {
  ValidateResponseDto,
  CreateValidatorConfigDto,
  UpdateValidatorConfigDto,
  ValidationFilterDto,
  ValidationResponseDto,
  PaginatedValidationResponseDto,
  ValidationResultDto,
  ValidatorConfigResponseDto,
} from './dto';
import {
  IAiResponseValidation,
  IAiValidatorConfig,
  AiResponseValidationStatus,
  AiResponseValidationType,
  AiResponseValidationSeverity,
  AiResponseValidationEvent,
  IValidationResult,
  IValidationError,
  IValidationWarning,
  IValidator,
  IValidatorResult,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { BusinessRuleException } from '@common/exceptions/business-rule.exception';
import { DuplicateResourceException } from '@common/exceptions/duplicate-resource.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class AiResponseValidationService {
  private readonly logger = new Logger(AiResponseValidationService.name);
  private readonly validators: Map<string, IValidator> = new Map();

  constructor(
    private readonly repository: AiResponseValidationRepository,
    private readonly eventQueue: AiValidationEventQueue,
  ) {
    this.registerDefaultValidators();
  }

  async validateResponse(dto: ValidateResponseDto): Promise<IValidationResult> {
    const startTime = Date.now();

    const validation = await this.repository.createValidation({
      workspaceId: dto.workspaceId,
      status: AiResponseValidationStatus.PENDING,
      orchestratorRequestId: dto.orchestratorRequestId,
      agentExecutionId: dto.agentExecutionId,
      workflowExecutionId: dto.workflowExecutionId,
      contextId: dto.contextId,
      capability: dto.capability,
      useCase: dto.useCase,
      modelProvider: dto.modelProvider,
      modelName: dto.modelName,
      originalResponse: dto.response,
      responseType: dto.responseType,
      overallValid: false,
      validationConfig: dto.validationConfig || null,
      repairAttempted: false,
      validationStartTime: new Date(),
      tags: dto.tags || [],
      metadata: dto.metadata || {},
    });

    await this.eventQueue.publish({
      event: AiResponseValidationEvent.VALIDATION_STARTED,
      workspaceId: dto.workspaceId,
      validationId: validation.id,
    });

    await this.repository.updateValidation(validation.id, {
      status: AiResponseValidationStatus.VALIDATING,
    });

    try {
      const applicableValidators = await this.repository.findApplicableValidators({
        workspaceId: dto.workspaceId,
        capability: dto.capability,
        useCase: dto.useCase,
        modelProvider: dto.modelProvider,
      });

      const errors: IValidationError[] = [];
      const warnings: IValidationWarning[] = [];
      let validatedResponse = dto.response;
      let shouldStopValidation = false;

      for (const validatorConfig of applicableValidators) {
        if (shouldStopValidation) break;

        const validator = this.validators.get(validatorConfig.validationType);
        if (!validator) {
          this.logger.warn(
            `Validator not found for type: ${validatorConfig.validationType}`,
          );
          continue;
        }

        const result = await validator.validate(
          validatedResponse,
          validatorConfig.config,
        );

        await this.repository.createValidationResult({
          validationId: validation.id,
          workspaceId: dto.workspaceId,
          validationType: validator.type,
          validatorName: validator.name,
          isValid: result.isValid,
          severity: result.severity,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          fieldPath: result.fieldPath,
          expectedValue: result.expectedValue,
          actualValue: result.actualValue,
          suggestion: result.suggestion,
          metadata: {},
        });

        await this.eventQueue.publish({
          event: AiResponseValidationEvent.VALIDATOR_EXECUTED,
          workspaceId: dto.workspaceId,
          validationId: validation.id,
          metadata: { validatorName: validator.name, isValid: result.isValid },
        });

        if (!result.isValid) {
          if (result.severity === AiResponseValidationSeverity.ERROR) {
            errors.push({
              validationType: validator.type,
              validatorName: validator.name,
              errorCode: result.errorCode || 'VALIDATION_ERROR',
              errorMessage: result.errorMessage || 'Validation failed',
              fieldPath: result.fieldPath,
              expectedValue: result.expectedValue,
              actualValue: result.actualValue,
              suggestion: result.suggestion,
            });

            if (validatorConfig.stopOnFailure) {
              shouldStopValidation = true;
            }

            if (validatorConfig.attemptRepair && validator.repair) {
              try {
                validatedResponse = await validator.repair(
                  validatedResponse,
                  validatorConfig.config,
                );

                await this.repository.updateValidation(validation.id, {
                  repairAttempted: true,
                  repairSuccessful: true,
                });

                await this.eventQueue.publish({
                  event: AiResponseValidationEvent.VALIDATION_REPAIRED,
                  workspaceId: dto.workspaceId,
                  validationId: validation.id,
                });
              } catch (repairError) {
                this.logger.warn(
                  `Failed to repair response: ${(repairError as Error).message}`,
                );
                await this.repository.updateValidation(validation.id, {
                  repairAttempted: true,
                  repairSuccessful: false,
                });
              }
            }
          } else if (result.severity === AiResponseValidationSeverity.WARNING) {
            warnings.push({
              validationType: validator.type,
              validatorName: validator.name,
              message: result.errorMessage || 'Validation warning',
              fieldPath: result.fieldPath,
              suggestion: result.suggestion,
            });
          }
        }
      }

      const overallValid = errors.length === 0;
      const confidenceScore = this.calculateConfidenceScore(errors, warnings);
      const qualityScore = this.calculateQualityScore(errors, warnings);
      const duration = Date.now() - startTime;

      const finalStatus = overallValid
        ? AiResponseValidationStatus.VALID
        : errors.some((e) => e.validationType === AiResponseValidationType.SAFETY)
        ? AiResponseValidationStatus.REJECTED
        : AiResponseValidationStatus.INVALID;

      await this.repository.updateValidation(validation.id, {
        status: finalStatus,
        overallValid,
        confidenceScore,
        qualityScore,
        validatedResponse,
        validationEndTime: new Date(),
        validationDuration: duration,
      });

      await this.repository.createHistory({
        validationId: validation.id,
        workspaceId: dto.workspaceId,
        action: 'VALIDATION_COMPLETED',
        newStatus: finalStatus,
        details: `Validation completed with ${errors.length} errors and ${warnings.length} warnings`,
        metadata: {},
      });

      const event =
        finalStatus === AiResponseValidationStatus.VALID
          ? AiResponseValidationEvent.VALIDATION_COMPLETED
          : finalStatus === AiResponseValidationStatus.REJECTED
          ? AiResponseValidationEvent.VALIDATION_REJECTED
          : AiResponseValidationEvent.VALIDATION_FAILED;

      await this.eventQueue.publish({
        event,
        workspaceId: dto.workspaceId,
        validationId: validation.id,
        status: finalStatus,
        overallValid,
      });

      return {
        validationId: validation.id,
        status: finalStatus,
        overallValid,
        confidenceScore,
        qualityScore,
        validatedResponse,
        errors,
        warnings,
      };
    } catch (error) {
      await this.repository.updateValidation(validation.id, {
        status: AiResponseValidationStatus.INVALID,
        validationEndTime: new Date(),
        validationDuration: Date.now() - startTime,
      });

      await this.eventQueue.publish({
        event: AiResponseValidationEvent.VALIDATION_FAILED,
        workspaceId: dto.workspaceId,
        validationId: validation.id,
        status: 'error',
      });

      throw error;
    }
  }

  async findValidationById(
    id: string,
    workspaceId: string,
  ): Promise<IAiResponseValidation> {
    const validation = await this.repository.findValidationById(id, workspaceId);
    if (!validation) {
      throw new ResourceNotFoundException(
        'Validation not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return validation;
  }

  async findAllValidations(
    filter: ValidationFilterDto,
  ): Promise<PaginatedValidationResponseDto> {
    const [data, total] = await this.repository.findAllValidations(filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as ValidationResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getValidationResults(
    id: string,
    workspaceId: string,
  ): Promise<any[]> {
    await this.findValidationById(id, workspaceId);
    return this.repository.findResultsByValidationId(id);
  }

  async getValidationHistory(
    id: string,
    workspaceId: string,
  ): Promise<any[]> {
    await this.findValidationById(id, workspaceId);
    return this.repository.findHistoryByValidationId(id);
  }

  async createValidatorConfig(
    dto: CreateValidatorConfigDto,
  ): Promise<IAiValidatorConfig> {
    const existing = await this.repository.findValidatorConfigByName(
      dto.name,
      dto.workspaceId,
    );

    if (existing) {
      throw new DuplicateResourceException(
        'Validator config with this name already exists',
        ErrorCode.DUPLICATE_RESOURCE,
      );
    }

    const data = {
      workspaceId: dto.workspaceId,
      name: dto.name,
      validationType: dto.validationType,
      capability: dto.capability,
      useCase: dto.useCase,
      agentType: dto.agentType,
      modelProvider: dto.modelProvider,
      enabled: dto.enabled ?? true,
      config: dto.config,
      priority: dto.priority ?? 0,
      stopOnFailure: dto.stopOnFailure ?? false,
      attemptRepair: dto.attemptRepair ?? false,
      tags: dto.tags || [],
      metadata: dto.metadata || {},
    };

    return (await this.repository.createValidatorConfig(
      data,
    )) as IAiValidatorConfig;
  }

  async updateValidatorConfig(
    id: string,
    dto: UpdateValidatorConfigDto,
  ): Promise<IAiValidatorConfig> {
    await this.findValidatorConfigById(id);

    return (await this.repository.updateValidatorConfig(
      id,
      dto,
    )) as IAiValidatorConfig;
  }

  async deleteValidatorConfig(id: string): Promise<void> {
    await this.findValidatorConfigById(id);
    await this.repository.deleteValidatorConfig(id);
  }

  async findValidatorConfigById(id: string): Promise<IAiValidatorConfig> {
    const config = await this.repository.findValidatorConfigById(id);
    if (!config) {
      throw new ResourceNotFoundException(
        'Validator config not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return config;
  }

  async getValidationStats(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    return this.repository.getValidationStats(workspaceId, startDate, endDate);
  }

  private registerDefaultValidators(): void {
    this.validators.set('SCHEMA', {
      name: 'SchemaValidator',
      type: AiResponseValidationType.SCHEMA,
      validate: async (response: unknown, config?: unknown) => {
        return {
          isValid: true,
          severity: AiResponseValidationSeverity.INFO,
        };
      },
    });

    this.validators.set('TYPE', {
      name: 'TypeValidator',
      type: AiResponseValidationType.TYPE,
      validate: async (response: unknown, config?: unknown) => {
        return {
          isValid: response !== null && response !== undefined,
          severity: AiResponseValidationSeverity.ERROR,
          errorCode: 'NULL_RESPONSE',
          errorMessage: 'Response is null or undefined',
        };
      },
    });

    this.validators.set('COMPLETENESS', {
      name: 'CompletenessValidator',
      type: AiResponseValidationType.COMPLETENESS,
      validate: async (response: unknown, config?: unknown) => {
        if (typeof response === 'string' && response.trim().length === 0) {
          return {
            isValid: false,
            severity: AiResponseValidationSeverity.ERROR,
            errorCode: 'EMPTY_RESPONSE',
            errorMessage: 'Response is empty',
          };
        }
        return {
          isValid: true,
          severity: AiResponseValidationSeverity.INFO,
        };
      },
    });
  }

  private calculateConfidenceScore(
    errors: IValidationError[],
    warnings: IValidationWarning[],
  ): number {
    const errorPenalty = errors.length * 0.2;
    const warningPenalty = warnings.length * 0.05;
    const score = Math.max(0, 1 - errorPenalty - warningPenalty);
    return Math.round(score * 100) / 100;
  }

  private calculateQualityScore(
    errors: IValidationError[],
    warnings: IValidationWarning[],
  ): number {
    if (errors.length > 0) {
      return Math.max(0, 1 - errors.length * 0.25);
    }
    if (warnings.length > 0) {
      return Math.max(0.5, 1 - warnings.length * 0.1);
    }
    return 1.0;
  }
}
