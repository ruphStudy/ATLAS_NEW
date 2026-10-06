import { Injectable, BadRequestException } from '@nestjs/common';
import { NormalizedReportItem, ReportType, SyncMode, ReportFormat } from '../interfaces';

@Injectable()
export class ReportSyncValidator {
  private readonly MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
  private readonly ALLOWED_FORMATS = [
    ReportFormat.CSV,
    ReportFormat.JSON,
    ReportFormat.XML,
    ReportFormat.GZIP,
    ReportFormat.ZIP,
    ReportFormat.TSV,
  ];

  validateSyncRequest(params: {
    workspaceId: string;
    accountId: string;
    providerKey: string;
    marketplaceKey: string;
    reportType: ReportType;
    mode: SyncMode;
    startDate?: Date;
    endDate?: Date;
  }): void {
    if (!params.workspaceId?.trim()) {
      throw new BadRequestException('Workspace ID is required');
    }
    if (!params.accountId?.trim()) {
      throw new BadRequestException('Account ID is required');
    }
    if (!params.providerKey?.trim()) {
      throw new BadRequestException('Provider key is required');
    }
    if (!params.marketplaceKey?.trim()) {
      throw new BadRequestException('Marketplace key is required');
    }
    if (!Object.values(ReportType).includes(params.reportType)) {
      throw new BadRequestException('Invalid report type');
    }
    if (!Object.values(SyncMode).includes(params.mode)) {
      throw new BadRequestException('Invalid sync mode');
    }

    if (params.mode === SyncMode.DATE_RANGE || params.mode === SyncMode.INCREMENTAL) {
      if (!params.startDate) {
        throw new BadRequestException('Start date is required for date range/incremental sync');
      }
      if (params.endDate && new Date(params.startDate) >= new Date(params.endDate)) {
        throw new BadRequestException('Start date must be before end date');
      }
    }
  }

  validateReportItem(item: NormalizedReportItem): void {
    if (!item.externalReportId?.trim()) {
      throw new BadRequestException('External report ID is required');
    }
    if (!Object.values(ReportType).includes(item.reportType)) {
      throw new BadRequestException('Invalid report type');
    }
    if (!Object.values(ReportFormat).includes(item.reportFormat)) {
      throw new BadRequestException('Invalid report format');
    }

    if (!this.ALLOWED_FORMATS.includes(item.reportFormat)) {
      throw new BadRequestException(`Report format ${item.reportFormat} is not supported`);
    }

    if (item.fileSize !== undefined && item.fileSize > this.MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE} bytes`);
    }

    if (item.availableUntil && new Date(item.availableUntil) < new Date()) {
      throw new BadRequestException('Report has expired');
    }
  }

  validateScheduleExpression(cron: string): void {
    if (!cron?.trim()) {
      throw new BadRequestException('Cron expression is required');
    }
    const parts = cron.trim().split(/\s+/);
    if (parts.length < 5 || parts.length > 6) {
      throw new BadRequestException('Invalid cron expression format');
    }
  }

  validateFileIntegrity(filePath: string, checksum: string, actualChecksum: string): void {
    if (checksum !== actualChecksum) {
      throw new BadRequestException(`File integrity check failed for ${filePath}`);
    }
  }

  validateReportFormat(format: ReportFormat): void {
    if (!this.ALLOWED_FORMATS.includes(format)) {
      throw new BadRequestException(`Unsupported report format: ${format}`);
    }
  }
}
