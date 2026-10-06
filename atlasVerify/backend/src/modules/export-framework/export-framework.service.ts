import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ExportFrameworkRepository } from './export-framework.repository';
import { ExportFrameworkEventQueue } from './jobs';
import { ReportBuilderService } from '@modules/report-builder/report-builder.service';
import {
  CreateExportRequestDto,
  CreateBulkExportDto,
  ExportFilterDto,
  ExecutionFilterDto,
  ExportRequestResponseDto,
  ExportExecutionResponseDto,
  BulkExportResponseDto,
  ExportFileResponseDto,
  ExportResultResponseDto,
  PaginatedExportRequestResponseDto,
  PaginatedExportExecutionResponseDto,
} from './dto';
import {
  ExportStatus,
  ExportMode,
  ExportEventType,
  ExportFormat,
  IExportRequest,
  IExportExecution,
  IBulkExport,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { BusinessRuleException } from '@common/exceptions/business-rule.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class ExportFrameworkService {
  private readonly logger = new Logger(ExportFrameworkService.name);
  private readonly SYNC_EXPORT_SIZE_LIMIT = 10000;
  private readonly DEFAULT_EXPIRY_HOURS = 24;
  private readonly DEFAULT_RETENTION_DAYS = 7;

  constructor(
    private readonly repository: ExportFrameworkRepository,
    private readonly eventQueue: ExportFrameworkEventQueue,
    private readonly reportBuilderService: ReportBuilderService,
  ) {}

  async createExport(dto: CreateExportRequestDto): Promise<ExportResultResponseDto> {
    if (dto.idempotencyKey) {
      const existing = await this.repository.findExportRequestByIdempotencyKey(
        dto.idempotencyKey,
        dto.workspaceId,
      );
      if (existing) {
        const execution = await this.repository.findExecutionsByRequest(existing.id, dto.workspaceId);
        if (execution.length > 0) {
          return this.mapExecutionToResult(existing, execution[0]);
        }
      }
    }

    const request = await this.repository.createExportRequest(dto);

    await this.eventQueue.publish({
      event: ExportEventType.EXPORT_REQUESTED,
      workspaceId: request.workspaceId,
      exportRequestId: request.id,
      timestamp: new Date(),
    });

    if (request.mode === ExportMode.SYNC) {
      return this.processExportSync(request);
    } else {
      this.processExportAsync(request);
      return {
        exportRequestId: request.id,
        exportExecutionId: 'pending',
        status: ExportStatus.PENDING,
      };
    }
  }

  async processExportSync(request: IExportRequest): Promise<ExportResultResponseDto> {
    const execution = await this.repository.createExecution({
      exportRequestId: request.id,
      workspaceId: request.workspaceId,
      exportKey: request.exportKey,
    });

    await this.executeExport(request, execution);

    const updatedExecution = await this.repository.findExecutionById(execution.id, request.workspaceId);
    return this.mapExecutionToResult(request, updatedExecution!);
  }

  async processExportAsync(request: IExportRequest): Promise<void> {
    const execution = await this.repository.createExecution({
      exportRequestId: request.id,
      workspaceId: request.workspaceId,
      exportKey: request.exportKey,
    });

    setImmediate(() => this.executeExport(request, execution));
  }

  async executeExport(request: IExportRequest, execution: IExportExecution): Promise<void> {
    const startTime = new Date();

    await this.repository.updateExecution(execution.id, {
      status: ExportStatus.PROCESSING,
      startedAt: startTime,
    });

    await this.eventQueue.publish({
      event: ExportEventType.EXPORT_STARTED,
      workspaceId: execution.workspaceId,
      exportRequestId: request.id,
      exportExecutionId: execution.id,
      timestamp: new Date(),
    });

    let attemptNumber = request.retryCount + 1;
    let lastError: Error | null = null;

    while (attemptNumber <= request.maxRetries) {
      try {
        const result = await this.performExport(request, execution);

        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();

        const expiresAt = new Date(Date.now() + this.DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000);

        const exportFile = await this.repository.createExportFile({
          exportExecutionId: execution.id,
          workspaceId: execution.workspaceId,
          fileName: result.fileName,
          filePath: result.filePath,
          fileSize: result.fileSize,
          format: request.format,
          mimeType: this.getMimeType(request.format),
          downloadUrl: result.downloadUrl,
          downloadExpiresAt: expiresAt,
          retentionPolicy: {
            deleteAfterDays: this.DEFAULT_RETENTION_DAYS,
          },
        });

        await this.repository.updateExecution(execution.id, {
          status: ExportStatus.COMPLETED,
          completedAt: endTime,
          duration,
          rowsProcessed: result.rowsProcessed,
          rowsTotal: result.rowsTotal,
          fileSize: result.fileSize,
          filePath: result.filePath,
          downloadUrl: result.downloadUrl,
          downloadExpiresAt: expiresAt,
        });

        await this.repository.updateExportRequest(request.id, {
          status: ExportStatus.COMPLETED,
        });

        await this.eventQueue.publish({
          event: ExportEventType.EXPORT_COMPLETED,
          workspaceId: execution.workspaceId,
          exportRequestId: request.id,
          exportExecutionId: execution.id,
          timestamp: new Date(),
          metadata: {
            fileSize: result.fileSize,
            rowsProcessed: result.rowsProcessed,
            duration,
          },
        });

        return;
      } catch (error) {
        lastError = error as Error;

        this.logger.warn(
          `Export attempt ${attemptNumber} failed for request ${request.id}: ${error.message}`,
        );

        if (attemptNumber >= request.maxRetries) {
          break;
        }

        const delayMs = this.calculateRetryDelay(attemptNumber, request.retryBackoff);
        await this.delay(delayMs);

        attemptNumber++;
        await this.repository.updateExportRequest(request.id, {
          retryCount: attemptNumber - 1,
        });
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    await this.repository.updateExecution(execution.id, {
      status: ExportStatus.FAILED,
      completedAt: endTime,
      duration,
      errorCode: (lastError as any)?.code || 'EXPORT_FAILED',
      errorMessage: lastError?.message || 'Export failed after max retries',
      errorStack: lastError?.stack,
    });

    await this.repository.updateExportRequest(request.id, {
      status: ExportStatus.FAILED,
    });

    await this.eventQueue.publish({
      event: ExportEventType.EXPORT_FAILED,
      workspaceId: execution.workspaceId,
      exportRequestId: request.id,
      exportExecutionId: execution.id,
      timestamp: new Date(),
      metadata: {
        errorCode: (lastError as any)?.code || 'EXPORT_FAILED',
        errorMessage: lastError?.message,
      },
    });
  }

  async createBulkExport(dto: CreateBulkExportDto): Promise<BulkExportResponseDto> {
    const bulkExport = await this.repository.createBulkExport(dto);

    await this.eventQueue.publish({
      event: ExportEventType.BULK_EXPORT_STARTED,
      workspaceId: bulkExport.workspaceId,
      bulkExportId: bulkExport.id,
      timestamp: new Date(),
    });

    const exportRequestIds: string[] = [];

    for (const exportDto of dto.exports) {
      const request = await this.repository.createExportRequest({
        ...exportDto,
        bulkExportId: bulkExport.id,
      });
      exportRequestIds.push(request.id);

      this.processExportAsync(request);
    }

    await this.repository.updateBulkExport(bulkExport.id, {
      exportRequestIds,
    });

    return bulkExport as BulkExportResponseDto;
  }

  async getExportRequest(id: string, workspaceId: string): Promise<ExportRequestResponseDto> {
    const request = await this.repository.findExportRequestById(id, workspaceId);
    if (!request) {
      throw new ResourceNotFoundException(
        `Export request ${id} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return request as ExportRequestResponseDto;
  }

  async getAllExportRequests(filter: ExportFilterDto): Promise<PaginatedExportRequestResponseDto> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    const { requests, total } = await this.repository.findAllExportRequests({
      ...filter,
      page,
      limit,
    });

    return {
      data: requests as ExportRequestResponseDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getExecution(id: string, workspaceId: string): Promise<ExportExecutionResponseDto> {
    const execution = await this.repository.findExecutionById(id, workspaceId);
    if (!execution) {
      throw new ResourceNotFoundException(
        `Export execution ${id} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return execution as ExportExecutionResponseDto;
  }

  async getAllExecutions(filter: ExecutionFilterDto): Promise<PaginatedExportExecutionResponseDto> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    const { executions, total } = await this.repository.findAllExecutions({
      ...filter,
      page,
      limit,
    });

    return {
      data: executions as ExportExecutionResponseDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDownloadUrl(executionId: string, workspaceId: string): Promise<string> {
    const execution = await this.repository.findExecutionById(executionId, workspaceId);
    if (!execution) {
      throw new ResourceNotFoundException(
        `Export execution ${executionId} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    if (execution.status !== ExportStatus.COMPLETED) {
      throw new BusinessRuleException(
        'Export is not completed',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const file = await this.repository.findExportFileByExecution(executionId, workspaceId);
    if (!file) {
      throw new ResourceNotFoundException(
        `Export file not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    if (file.isExpired || new Date() > file.downloadExpiresAt) {
      throw new BusinessRuleException(
        'Download link has expired',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    await this.repository.incrementDownloadCount(file.id);

    await this.eventQueue.publish({
      event: ExportEventType.EXPORT_DOWNLOADED,
      workspaceId,
      exportExecutionId: executionId,
      timestamp: new Date(),
    });

    return file.downloadUrl;
  }

  async cancelExport(id: string, workspaceId: string): Promise<ExportRequestResponseDto> {
    const request = await this.repository.findExportRequestById(id, workspaceId);
    if (!request) {
      throw new ResourceNotFoundException(
        `Export request ${id} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    if (request.status === ExportStatus.COMPLETED || request.status === ExportStatus.FAILED) {
      throw new BusinessRuleException(
        'Cannot cancel completed or failed export',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const cancelled = await this.repository.cancelExportRequest(id, workspaceId);

    await this.eventQueue.publish({
      event: ExportEventType.EXPORT_CANCELLED,
      workspaceId,
      exportRequestId: id,
      timestamp: new Date(),
    });

    return cancelled as ExportRequestResponseDto;
  }

  async cleanupExpiredExports(): Promise<void> {
    const expiredFiles = await this.repository.findExpiredFiles();

    for (const file of expiredFiles) {
      await this.repository.markFileAsExpired(file.id);

      await this.eventQueue.publish({
        event: ExportEventType.EXPORT_EXPIRED,
        workspaceId: file.workspaceId,
        exportExecutionId: file.exportExecutionId,
        timestamp: new Date(),
      });

      if (file.retentionPolicy) {
        const shouldDelete =
          file.retentionPolicy.deleteAfterDownloads &&
          file.downloadCount >= file.retentionPolicy.deleteAfterDownloads;

        if (shouldDelete) {
          await this.repository.markFileAsDeleted(file.id);

          await this.eventQueue.publish({
            event: ExportEventType.EXPORT_CLEANUP,
            workspaceId: file.workspaceId,
            timestamp: new Date(),
          });
        }
      }
    }
  }

  private async performExport(request: IExportRequest, execution: IExportExecution): Promise<{
    fileName: string;
    filePath: string;
    fileSize: number;
    downloadUrl: string;
    rowsProcessed: number;
    rowsTotal: number;
  }> {
    let data: any;
    let rowsTotal = 0;

    if (request.type === 'report') {
      const reportResult = await this.reportBuilderService.executeReport({
        reportDefinitionId: request.sourceId,
        workspaceId: request.workspaceId,
        filters: request.config.filters,
        dateRange: request.config.dateRange,
      });

      data = reportResult.rows;
      rowsTotal = reportResult.total;
    } else {
      data = [];
      rowsTotal = 0;
    }

    const fileName = `${request.exportKey}.${request.format}`;
    const filePath = `/exports/${request.workspaceId}/${fileName}`;
    const fileSize = 1024;
    const downloadUrl = `https://example.com/download/${fileName}`;

    return {
      fileName,
      filePath,
      fileSize,
      downloadUrl,
      rowsProcessed: data.length,
      rowsTotal,
    };
  }

  private mapExecutionToResult(request: IExportRequest, execution: IExportExecution): ExportResultResponseDto {
    return {
      exportRequestId: request.id,
      exportExecutionId: execution.id,
      status: execution.status,
      downloadUrl: execution.downloadUrl,
      downloadExpiresAt: execution.downloadExpiresAt,
      fileSize: execution.fileSize,
      rowsProcessed: execution.rowsProcessed,
      duration: execution.duration,
      metadata: execution.metadata,
    };
  }

  private getMimeType(format: ExportFormat): string {
    const mimeTypes: Record<ExportFormat, string> = {
      [ExportFormat.CSV]: 'text/csv',
      [ExportFormat.XLSX]: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      [ExportFormat.PDF]: 'application/pdf',
      [ExportFormat.JSON]: 'application/json',
    };

    return mimeTypes[format];
  }

  private calculateRetryDelay(attemptNumber: number, retryBackoff: any): number {
    if (retryBackoff.type === 'fixed') {
      return Math.min(retryBackoff.initialDelayMs, retryBackoff.maxDelayMs);
    }

    const delay = retryBackoff.initialDelayMs * Math.pow(retryBackoff.multiplier || 2, attemptNumber - 1);
    return Math.min(delay, retryBackoff.maxDelayMs);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
