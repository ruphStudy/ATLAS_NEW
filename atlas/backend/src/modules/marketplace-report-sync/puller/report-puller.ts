import { Injectable, Logger } from '@nestjs/common';
import { ReportSyncRepository } from '../repository/report-sync.repository';
import { ReportSyncValidator } from '../validator/report-sync.validator';
import { ReportSyncStateManager } from '../state/report-sync-state.manager';
import { ReportSyncEventQueue } from '../events/report-sync-events.queue';
import { ReportMapper } from '../mapper/report-mapper';
import { ReportParser } from '../parser/report-parser';
import {
  ReportSyncAdapter,
  NormalizedReportItem,
  ReportSyncEvent,
  ItemSyncStatus,
  ReportType,
  ReportStatus,
} from '../interfaces';

const MAX_PAGES_PER_JOB = 1000;
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_POLL_INTERVAL = 30000; // 30 seconds
const DEFAULT_MAX_POLL_ATTEMPTS = 40; // 20 minutes max

@Injectable()
export class ReportPuller {
  private readonly logger = new Logger(ReportPuller.name);

  constructor(
    private readonly repository: ReportSyncRepository,
    private readonly validator: ReportSyncValidator,
    private readonly stateManager: ReportSyncStateManager,
    private readonly eventQueue: ReportSyncEventQueue,
    private readonly mapper: ReportMapper,
    private readonly parser: ReportParser,
  ) {}

  async run(params: {
    jobId: string;
    workspaceId: string;
    accountId: string;
    adapter: ReportSyncAdapter;
    reportType: ReportType;
    startDate?: Date;
    endDate?: Date;
    cursor?: string;
    batchSize?: number;
    pollInterval?: number;
    maxPollAttempts?: number;
  }): Promise<void> {
    const {
      jobId,
      workspaceId,
      accountId,
      adapter,
      reportType,
      startDate,
      endDate,
      batchSize = DEFAULT_BATCH_SIZE,
      pollInterval = DEFAULT_POLL_INTERVAL,
      maxPollAttempts = DEFAULT_MAX_POLL_ATTEMPTS,
    } = params;
    let cursor = params.cursor;
    let pageCount = 0;
    let totalProcessed = 0;

    try {
      await this.stateManager.startJob(jobId, workspaceId);

      while (pageCount < MAX_PAGES_PER_JOB) {
        const result = await adapter.listReports({
          accountId,
          reportType,
          startDate,
          endDate,
          cursor,
          limit: batchSize,
        });

        for (const rawReport of result.items) {
          try {
            await this.pullReport(
              jobId,
              workspaceId,
              accountId,
              adapter,
              rawReport,
              pollInterval,
              maxPollAttempts,
            );
            totalProcessed++;
          } catch (error) {
            const err = error as Error;
            this.logger.error(`Failed to pull report ${rawReport.externalReportId}: ${err.message}`);
            await this.stateManager.recordItemResult(jobId, workspaceId, {
              externalReportId: rawReport.externalReportId,
              reportType: rawReport.reportType,
              status: ItemSyncStatus.FAILED,
              errorMessage: err.message,
            });
            await this.stateManager.incrementCounters(jobId, workspaceId, { failed: 1, processed: 1 });
          }
        }

        await this.stateManager.updateProgress(jobId, workspaceId, {
          cursor: result.nextCursor,
          processedReports: totalProcessed,
        });

        if (!result.hasMore) break;
        cursor = result.nextCursor;
        pageCount++;
      }

      await this.stateManager.completeJob(jobId, workspaceId);
      await this.eventQueue.publish({
        event: ReportSyncEvent.SYNC_COMPLETED,
        workspaceId,
        accountId,
        jobId,
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Report pull job ${jobId} failed: ${err.message}`);
      await this.stateManager.failJob(jobId, workspaceId, err.message);
      await this.eventQueue.publish({
        event: ReportSyncEvent.SYNC_FAILED,
        workspaceId,
        accountId,
        jobId,
        data: { error: err.message },
      });
    }
  }

  private async pullReport(
    jobId: string,
    workspaceId: string,
    accountId: string,
    adapter: ReportSyncAdapter,
    report: NormalizedReportItem,
    pollInterval: number,
    maxPollAttempts: number,
  ): Promise<void> {
    this.validator.validateReportItem(report);

    const existingRef = await this.repository.getExternalRef(workspaceId, accountId, report.externalReportId);

    if (existingRef && existingRef.status === ReportStatus.IMPORTED) {
      await this.stateManager.recordItemResult(jobId, workspaceId, {
        externalReportId: report.externalReportId,
        reportType: report.reportType,
        status: ItemSyncStatus.SKIPPED,
        operation: 'ALREADY_IMPORTED',
      });
      await this.stateManager.incrementCounters(jobId, workspaceId, { skipped: 1, processed: 1 });
      return;
    }

    // Wait for report to be ready if it's still processing
    if (report.status === ReportStatus.REQUESTED || report.status === ReportStatus.PROCESSING) {
      report = await this.pollReportStatus(adapter, accountId, report, pollInterval, maxPollAttempts);
    }

    if (report.status !== ReportStatus.AVAILABLE && report.status !== ReportStatus.DOWNLOADED) {
      await this.stateManager.recordItemResult(jobId, workspaceId, {
        externalReportId: report.externalReportId,
        reportType: report.reportType,
        status: ItemSyncStatus.FAILED,
        errorMessage: `Report status is ${report.status}`,
      });
      await this.stateManager.incrementCounters(jobId, workspaceId, { failed: 1, processed: 1 });
      return;
    }

    // Download report
    const downloadResult = await adapter.downloadReport({
      accountId,
      externalReportId: report.externalReportId,
      downloadUrl: report.downloadUrl,
    });

    if (!downloadResult.success) {
      await this.stateManager.recordItemResult(jobId, workspaceId, {
        externalReportId: report.externalReportId,
        reportType: report.reportType,
        status: ItemSyncStatus.FAILED,
        errorMessage: downloadResult.error,
      });
      await this.stateManager.incrementCounters(jobId, workspaceId, { failed: 1, processed: 1 });
      return;
    }

    await this.eventQueue.publish({
      event: ReportSyncEvent.REPORT_DOWNLOADED,
      workspaceId,
      accountId,
      jobId,
      externalReportId: report.externalReportId,
      reportType: report.reportType,
    });

    // Parse and import report
    const parseResult = await this.parser.parse({
      filePath: downloadResult.filePath,
      format: downloadResult.format,
      reportType: report.reportType,
    });

    await this.repository.createReportDocument({
      workspaceId,
      accountId,
      externalReportId: report.externalReportId,
      reportType: report.reportType,
      format: downloadResult.format,
      filePath: downloadResult.filePath,
      fileSize: downloadResult.fileSize,
      checksum: downloadResult.checksum,
      recordCount: parseResult.recordCount,
      startDate: report.metadata?.startDate,
      endDate: report.metadata?.endDate,
      metadata: { parseErrors: parseResult.errors },
    });

    await this.repository.upsertExternalRef({
      workspaceId,
      accountId,
      externalReportId: report.externalReportId,
      externalRequestId: report.externalRequestId,
      reportType: report.reportType,
      status: ReportStatus.IMPORTED,
      requestedAt: report.requestedAt,
      generatedAt: report.generatedAt,
      downloadedAt: new Date(),
      importedAt: new Date(),
      availableUntil: report.availableUntil,
      lastSyncedAt: new Date(),
      checksum: downloadResult.checksum,
      metadata: { recordCount: parseResult.recordCount },
    });

    await this.stateManager.recordItemResult(jobId, workspaceId, {
      externalReportId: report.externalReportId,
      reportType: report.reportType,
      status: ItemSyncStatus.SUCCESS,
      operation: 'IMPORTED',
      recordsImported: parseResult.recordCount,
    });
    await this.stateManager.incrementCounters(jobId, workspaceId, { success: 1, processed: 1 });

    await this.eventQueue.publish({
      event: ReportSyncEvent.REPORT_IMPORTED,
      workspaceId,
      accountId,
      jobId,
      externalReportId: report.externalReportId,
      reportType: report.reportType,
      data: { recordCount: parseResult.recordCount },
    });
  }

  private async pollReportStatus(
    adapter: ReportSyncAdapter,
    accountId: string,
    report: NormalizedReportItem,
    pollInterval: number,
    maxAttempts: number,
  ): Promise<NormalizedReportItem> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      await this.sleep(pollInterval);

      const statusResult = await adapter.checkReportStatus({
        accountId,
        externalRequestId: report.externalRequestId || report.externalReportId,
      });

      if (statusResult.status === ReportStatus.AVAILABLE) {
        return {
          ...report,
          status: statusResult.status,
          externalReportId: statusResult.externalReportId || report.externalReportId,
          downloadUrl: statusResult.downloadUrl || report.downloadUrl,
          availableUntil: statusResult.availableUntil || report.availableUntil,
        };
      }

      if (statusResult.status === ReportStatus.FAILED || statusResult.status === ReportStatus.CANCELLED) {
        return { ...report, status: statusResult.status };
      }

      attempts++;
    }

    throw new Error(`Report ${report.externalReportId} did not become available within the timeout period`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
