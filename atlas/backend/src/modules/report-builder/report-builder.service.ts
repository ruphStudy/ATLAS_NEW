import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ReportBuilderRepository } from './report-builder.repository';
import { ReportBuilderEventQueue } from './jobs';
import {
  CreateReportDefinitionDto,
  UpdateReportDefinitionDto,
  ExecuteReportDto,
  CreateReportTemplateDto,
  UpdateReportTemplateDto,
  ReportFilterDto2,
  ReportDefinitionResponseDto,
  ReportExecutionResponseDto,
  ReportResultResponseDto,
  ReportVersionResponseDto,
  ReportTemplateResponseDto,
} from './dto';
import {
  ReportEventType,
  ReportStatus,
  ReportExecutionStatus,
} from './interfaces';

@Injectable()
export class ReportBuilderService {
  private readonly logger = new Logger(ReportBuilderService.name);

  constructor(
    private readonly repository: ReportBuilderRepository,
    private readonly eventQueue: ReportBuilderEventQueue,
  ) {}

  async createDefinition(dto: CreateReportDefinitionDto): Promise<ReportDefinitionResponseDto> {
    const definition = await this.repository.createDefinition({
      ...dto,
      status: ReportStatus.DRAFT,
      drillDownEnabled: dto.drillDownEnabled ?? true,
      cacheEnabled: dto.cacheEnabled ?? true,
      cacheTtlMinutes: dto.cacheTtlMinutes ?? 15,
    });

    await this.repository.createVersion({
      reportDefinitionId: definition.id,
      version: 1,
      definition,
      changeDescription: 'Initial version',
      createdBy: dto.createdBy,
    });

    await this.eventQueue.publish({
      event: ReportEventType.REPORT_CREATED,
      workspaceId: definition.workspaceId || 'system',
      reportDefinitionId: definition.id,
      reportKey: definition.reportKey,
      timestamp: new Date(),
    });

    return definition as ReportDefinitionResponseDto;
  }

  async updateDefinition(
    id: string,
    workspaceId: string,
    dto: UpdateReportDefinitionDto,
  ): Promise<ReportDefinitionResponseDto> {
    const existing = await this.repository.findDefinitionById(id, workspaceId);
    if (!existing) {
      throw new NotFoundException(`Report definition ${id} not found`);
    }

    const updated = await this.repository.updateDefinition(id, {
      ...dto,
      version: existing.version + 1,
    });

    await this.repository.createVersion({
      reportDefinitionId: id,
      version: updated.version,
      definition: updated,
      changeDescription: `Updated by ${dto.updatedBy}`,
      createdBy: dto.updatedBy,
    });

    await this.repository.invalidateCache(workspaceId, `report:${existing.reportKey}:*`);

    await this.eventQueue.publish({
      event: ReportEventType.REPORT_UPDATED,
      workspaceId,
      reportDefinitionId: id,
      reportKey: existing.reportKey,
      timestamp: new Date(),
      metadata: { version: updated.version },
    });

    return updated as ReportDefinitionResponseDto;
  }

  async getDefinitionById(id: string, workspaceId: string): Promise<ReportDefinitionResponseDto> {
    const definition = await this.repository.findDefinitionById(id, workspaceId);
    if (!definition) {
      throw new NotFoundException(`Report definition ${id} not found`);
    }

    return definition as ReportDefinitionResponseDto;
  }

  async getAllDefinitions(filter: ReportFilterDto2): Promise<{
    definitions: ReportDefinitionResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;

    const { definitions, total } = await this.repository.findAllDefinitions({
      ...filter,
      page,
      limit,
    });

    return {
      definitions: definitions as ReportDefinitionResponseDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async cloneDefinition(
    id: string,
    workspaceId: string,
    createdBy: string,
    newName?: string,
  ): Promise<ReportDefinitionResponseDto> {
    const existing = await this.repository.findDefinitionById(id, workspaceId);
    if (!existing) {
      throw new NotFoundException(`Report definition ${id} not found`);
    }

    const cloned = await this.repository.cloneDefinition(id, workspaceId, createdBy, newName);

    await this.eventQueue.publish({
      event: ReportEventType.REPORT_CLONED,
      workspaceId,
      reportDefinitionId: cloned.id,
      reportKey: cloned.reportKey,
      timestamp: new Date(),
      metadata: { sourceId: id },
    });

    return cloned as ReportDefinitionResponseDto;
  }

  async publishDefinition(id: string, workspaceId: string): Promise<ReportDefinitionResponseDto> {
    const existing = await this.repository.findDefinitionById(id, workspaceId);
    if (!existing) {
      throw new NotFoundException(`Report definition ${id} not found`);
    }

    const published = await this.repository.publishDefinition(id, workspaceId);

    await this.eventQueue.publish({
      event: ReportEventType.REPORT_PUBLISHED,
      workspaceId,
      reportDefinitionId: id,
      reportKey: existing.reportKey,
      timestamp: new Date(),
    });

    return published as ReportDefinitionResponseDto;
  }

  async archiveDefinition(id: string, workspaceId: string): Promise<ReportDefinitionResponseDto> {
    const existing = await this.repository.findDefinitionById(id, workspaceId);
    if (!existing) {
      throw new NotFoundException(`Report definition ${id} not found`);
    }

    const archived = await this.repository.archiveDefinition(id, workspaceId);

    await this.eventQueue.publish({
      event: ReportEventType.REPORT_ARCHIVED,
      workspaceId,
      reportDefinitionId: id,
      reportKey: existing.reportKey,
      timestamp: new Date(),
    });

    return archived as ReportDefinitionResponseDto;
  }

  async restoreDefinition(id: string, workspaceId: string): Promise<ReportDefinitionResponseDto> {
    const existing = await this.repository.findDefinitionById(id, workspaceId);
    if (!existing) {
      throw new NotFoundException(`Report definition ${id} not found`);
    }

    const restored = await this.repository.restoreDefinition(id, workspaceId);

    await this.eventQueue.publish({
      event: ReportEventType.REPORT_RESTORED,
      workspaceId,
      reportDefinitionId: id,
      reportKey: existing.reportKey,
      timestamp: new Date(),
    });

    return restored as ReportDefinitionResponseDto;
  }

  async executeReport(dto: ExecuteReportDto): Promise<ReportResultResponseDto> {
    const definition = await this.repository.findDefinitionById(dto.reportDefinitionId, dto.workspaceId);
    if (!definition) {
      throw new NotFoundException(`Report definition ${dto.reportDefinitionId} not found`);
    }

    const cacheKey = this.buildCacheKey(definition.reportKey, dto);

    if (definition.cacheEnabled && !dto.forceRefresh) {
      const cached = await this.repository.getCachedResult(dto.workspaceId, cacheKey);
      if (cached) {
        return cached as ReportResultResponseDto;
      }
    }

    const execution = await this.repository.createExecution({
      reportDefinitionId: dto.reportDefinitionId,
      workspaceId: dto.workspaceId,
      reportKey: definition.reportKey,
      status: ReportExecutionStatus.RUNNING,
      filters: dto.filters,
      dateRange: dto.dateRange,
      limit: dto.limit,
      offset: dto.offset,
      executedBy: dto.executedBy,
    });

    await this.eventQueue.publish({
      event: ReportEventType.EXECUTION_STARTED,
      workspaceId: dto.workspaceId,
      reportDefinitionId: dto.reportDefinitionId,
      reportKey: definition.reportKey,
      timestamp: new Date(),
      metadata: { executionId: execution.id },
    });

    try {
      const result = await this.performExecution(definition, dto, execution.id);

      const endTime = new Date();
      const duration = endTime.getTime() - execution.startTime.getTime();

      await this.repository.updateExecution(execution.id, {
        status: ReportExecutionStatus.COMPLETED,
        endTime,
        duration,
        resultCount: result.total,
      });

      if (definition.cacheEnabled) {
        await this.repository.setCachedResult(
          dto.workspaceId,
          cacheKey,
          result,
          definition.cacheTtlMinutes || 15,
        );
      }

      await this.eventQueue.publish({
        event: ReportEventType.EXECUTION_COMPLETED,
        workspaceId: dto.workspaceId,
        reportDefinitionId: dto.reportDefinitionId,
        reportKey: definition.reportKey,
        timestamp: new Date(),
        metadata: { executionId: execution.id, resultCount: result.total },
      });

      return result as ReportResultResponseDto;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - execution.startTime.getTime();

      await this.repository.updateExecution(execution.id, {
        status: ReportExecutionStatus.FAILED,
        endTime,
        duration,
        errorCode: (error as any).code || 'EXECUTION_ERROR',
        errorMessage: (error as Error).message,
      });

      await this.eventQueue.publish({
        event: ReportEventType.EXECUTION_FAILED,
        workspaceId: dto.workspaceId,
        reportDefinitionId: dto.reportDefinitionId,
        reportKey: definition.reportKey,
        timestamp: new Date(),
        metadata: { executionId: execution.id, error: (error as Error).message },
      });

      throw error;
    }
  }

  async getVersions(reportDefinitionId: string, workspaceId: string): Promise<ReportVersionResponseDto[]> {
    const definition = await this.repository.findDefinitionById(reportDefinitionId, workspaceId);
    if (!definition) {
      throw new NotFoundException(`Report definition ${reportDefinitionId} not found`);
    }

    const versions = await this.repository.findVersionsByDefinitionId(reportDefinitionId);
    return versions as ReportVersionResponseDto[];
  }

  async getExecutionHistory(
    reportDefinitionId: string,
    workspaceId: string,
    limit?: number,
  ): Promise<ReportExecutionResponseDto[]> {
    const definition = await this.repository.findDefinitionById(reportDefinitionId, workspaceId);
    if (!definition) {
      throw new NotFoundException(`Report definition ${reportDefinitionId} not found`);
    }

    const history = await this.repository.findExecutionsByDefinitionId(reportDefinitionId, workspaceId, limit);
    return history as ReportExecutionResponseDto[];
  }

  async createTemplate(dto: CreateReportTemplateDto): Promise<ReportTemplateResponseDto> {
    const template = await this.repository.createTemplate(dto);

    await this.eventQueue.publish({
      event: ReportEventType.TEMPLATE_CREATED,
      workspaceId: template.workspaceId || 'system',
      timestamp: new Date(),
      metadata: { templateId: template.id },
    });

    return template as ReportTemplateResponseDto;
  }

  async updateTemplate(
    id: string,
    workspaceId: string,
    dto: UpdateReportTemplateDto,
  ): Promise<ReportTemplateResponseDto> {
    const existing = await this.repository.findTemplateById(id, workspaceId);
    if (!existing) {
      throw new NotFoundException(`Report template ${id} not found`);
    }

    const updated = await this.repository.updateTemplate(id, dto);
    return updated as ReportTemplateResponseDto;
  }

  async getTemplateById(id: string, workspaceId: string): Promise<ReportTemplateResponseDto> {
    const template = await this.repository.findTemplateById(id, workspaceId);
    if (!template) {
      throw new NotFoundException(`Report template ${id} not found`);
    }

    return template as ReportTemplateResponseDto;
  }

  async getAllTemplates(workspaceId?: string): Promise<ReportTemplateResponseDto[]> {
    const templates = await this.repository.findAllTemplates(workspaceId);
    return templates as ReportTemplateResponseDto[];
  }

  async deleteTemplate(id: string, workspaceId: string): Promise<void> {
    const existing = await this.repository.findTemplateById(id, workspaceId);
    if (!existing) {
      throw new NotFoundException(`Report template ${id} not found`);
    }

    await this.repository.deleteTemplate(id, workspaceId);
  }

  async invalidateCache(workspaceId: string, pattern?: string): Promise<number> {
    return this.repository.invalidateCache(workspaceId, pattern);
  }

  private async performExecution(
    definition: any,
    dto: ExecuteReportDto,
    executionId: string,
  ): Promise<ReportResultResponseDto> {
    return {
      executionId,
      reportDefinitionId: definition.id,
      workspaceId: dto.workspaceId,
      columns: definition.columns,
      rows: [],
      total: 0,
      aggregations: {},
      metadata: {},
    };
  }

  private buildCacheKey(reportKey: string, dto: ExecuteReportDto): string {
    const parts = ['report', reportKey];

    if (dto.dateRange) {
      parts.push(dto.dateRange.start.toISOString().split('T')[0]);
      parts.push(dto.dateRange.end.toISOString().split('T')[0]);
    }

    if (dto.filters?.length) {
      const filterKey = dto.filters
        .map(f => `${f.columnKey}:${f.operator}:${f.value}`)
        .join(',');
      parts.push(filterKey);
    }

    if (dto.limit) parts.push(`limit:${dto.limit}`);
    if (dto.offset) parts.push(`offset:${dto.offset}`);

    return parts.join(':');
  }
}
