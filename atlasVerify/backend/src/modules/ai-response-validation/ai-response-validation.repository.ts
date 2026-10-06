import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  IAiResponseValidation,
  IAiResponseValidationResult,
  IAiResponseValidationHistory,
  IAiValidatorConfig,
} from './interfaces';
import { ValidationFilterDto } from './dto';

@Injectable()
export class AiResponseValidationRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createValidation(
    data: Partial<IAiResponseValidation>,
  ): Promise<IAiResponseValidation> {
    return this.prisma.aiResponseValidation.create({
      data: data as any,
    }) as Promise<IAiResponseValidation>;
  }

  async updateValidation(
    id: string,
    data: Partial<IAiResponseValidation>,
  ): Promise<IAiResponseValidation> {
    return this.prisma.aiResponseValidation.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiResponseValidation>;
  }

  async findValidationById(
    id: string,
    workspaceId: string,
  ): Promise<IAiResponseValidation | null> {
    return this.prisma.aiResponseValidation.findFirst({
      where: { id, workspaceId },
    }) as Promise<IAiResponseValidation | null>;
  }

  async findAllValidations(
    filter: ValidationFilterDto,
  ): Promise<[IAiResponseValidation[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId: filter.workspaceId };

    if (filter.status) where.status = filter.status;
    if (filter.capability) where.capability = filter.capability;
    if (filter.modelProvider) where.modelProvider = filter.modelProvider;
    if (filter.orchestratorRequestId) {
      where.orchestratorRequestId = filter.orchestratorRequestId;
    }
    if (filter.agentExecutionId) {
      where.agentExecutionId = filter.agentExecutionId;
    }
    if (filter.workflowExecutionId) {
      where.workflowExecutionId = filter.workflowExecutionId;
    }

    const [data, total] = await Promise.all([
      this.prisma.aiResponseValidation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiResponseValidation.count({ where }),
    ]);

    return [data as IAiResponseValidation[], total];
  }

  async createValidationResult(
    data: Partial<IAiResponseValidationResult>,
  ): Promise<IAiResponseValidationResult> {
    return this.prisma.aiResponseValidationResult.create({
      data: data as any,
    }) as Promise<IAiResponseValidationResult>;
  }

  async findResultsByValidationId(
    validationId: string,
  ): Promise<IAiResponseValidationResult[]> {
    return this.prisma.aiResponseValidationResult.findMany({
      where: { validationId },
      orderBy: { createdAt: 'asc' },
    }) as Promise<IAiResponseValidationResult[]>;
  }

  async createHistory(
    data: Partial<IAiResponseValidationHistory>,
  ): Promise<IAiResponseValidationHistory> {
    return this.prisma.aiResponseValidationHistory.create({
      data: data as any,
    }) as Promise<IAiResponseValidationHistory>;
  }

  async findHistoryByValidationId(
    validationId: string,
  ): Promise<IAiResponseValidationHistory[]> {
    return this.prisma.aiResponseValidationHistory.findMany({
      where: { validationId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<IAiResponseValidationHistory[]>;
  }

  async createValidatorConfig(
    data: Partial<IAiValidatorConfig>,
  ): Promise<IAiValidatorConfig> {
    return this.prisma.aiValidatorConfig.create({
      data: data as any,
    }) as Promise<IAiValidatorConfig>;
  }

  async updateValidatorConfig(
    id: string,
    data: Partial<IAiValidatorConfig>,
  ): Promise<IAiValidatorConfig> {
    return this.prisma.aiValidatorConfig.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiValidatorConfig>;
  }

  async findValidatorConfigById(id: string): Promise<IAiValidatorConfig | null> {
    return this.prisma.aiValidatorConfig.findFirst({
      where: { id, deletedAt: null },
    }) as Promise<IAiValidatorConfig | null>;
  }

  async findValidatorConfigByName(
    name: string,
    workspaceId?: string,
  ): Promise<IAiValidatorConfig | null> {
    return this.prisma.aiValidatorConfig.findFirst({
      where: {
        name,
        workspaceId: workspaceId || null,
        deletedAt: null,
      },
    }) as Promise<IAiValidatorConfig | null>;
  }

  async findApplicableValidators(params: {
    workspaceId?: string;
    capability?: string;
    useCase?: string;
    modelProvider?: string;
  }): Promise<IAiValidatorConfig[]> {
    const where: any = {
      enabled: true,
      deletedAt: null,
      OR: [{ workspaceId: null }, { workspaceId: params.workspaceId }],
    };

    if (params.capability) {
      where.OR = [
        ...(where.OR || []),
        { capability: params.capability },
        { capability: null },
      ];
    }

    if (params.useCase) {
      where.OR = [
        ...(where.OR || []),
        { useCase: params.useCase },
        { useCase: null },
      ];
    }

    if (params.modelProvider) {
      where.OR = [
        ...(where.OR || []),
        { modelProvider: params.modelProvider },
        { modelProvider: null },
      ];
    }

    return this.prisma.aiValidatorConfig.findMany({
      where,
      orderBy: { priority: 'desc' },
    }) as Promise<IAiValidatorConfig[]>;
  }

  async deleteValidatorConfig(id: string): Promise<void> {
    await this.prisma.aiValidatorConfig.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getValidationStats(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const where: any = { workspaceId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalValidations, validResponses, invalidResponses, stats] =
      await Promise.all([
        this.prisma.aiResponseValidation.count({ where }),
        this.prisma.aiResponseValidation.count({
          where: { ...where, overallValid: true },
        }),
        this.prisma.aiResponseValidation.count({
          where: { ...where, overallValid: false },
        }),
        this.prisma.aiResponseValidation.aggregate({
          where,
          _avg: {
            confidenceScore: true,
            qualityScore: true,
            validationDuration: true,
          },
        }),
      ]);

    return {
      totalValidations,
      validResponses,
      invalidResponses,
      validationRate:
        totalValidations > 0 ? validResponses / totalValidations : 0,
      avgConfidenceScore: stats._avg.confidenceScore || 0,
      avgQualityScore: stats._avg.qualityScore || 0,
      avgValidationDuration: stats._avg.validationDuration || 0,
    };
  }
}
