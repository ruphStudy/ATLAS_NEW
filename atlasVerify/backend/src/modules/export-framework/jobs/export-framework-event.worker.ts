import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IExportEventPayload, ExportEventType } from '../interfaces';

@Processor('export-framework-events')
export class ExportFrameworkEventWorker extends WorkerHost {
  private readonly logger = new Logger(ExportFrameworkEventWorker.name);

  async process(job: Job<IExportEventPayload>): Promise<void> {
    const { event, workspaceId, exportRequestId, exportExecutionId, bulkExportId, metadata } = job.data;

    this.logger.log(
      `Processing event: ${event} for workspace: ${workspaceId}, request: ${exportRequestId}, execution: ${exportExecutionId}`,
    );

    try {
      switch (event) {
        case ExportEventType.EXPORT_REQUESTED:
          await this.handleExportRequested(job.data);
          break;
        case ExportEventType.EXPORT_STARTED:
          await this.handleExportStarted(job.data);
          break;
        case ExportEventType.EXPORT_PROGRESS:
          await this.handleExportProgress(job.data);
          break;
        case ExportEventType.EXPORT_COMPLETED:
          await this.handleExportCompleted(job.data);
          break;
        case ExportEventType.EXPORT_FAILED:
          await this.handleExportFailed(job.data);
          break;
        case ExportEventType.EXPORT_CANCELLED:
          await this.handleExportCancelled(job.data);
          break;
        case ExportEventType.EXPORT_EXPIRED:
          await this.handleExportExpired(job.data);
          break;
        case ExportEventType.EXPORT_DOWNLOADED:
          await this.handleExportDownloaded(job.data);
          break;
        case ExportEventType.EXPORT_CLEANUP:
          await this.handleExportCleanup(job.data);
          break;
        case ExportEventType.BULK_EXPORT_STARTED:
          await this.handleBulkExportStarted(job.data);
          break;
        case ExportEventType.BULK_EXPORT_COMPLETED:
          await this.handleBulkExportCompleted(job.data);
          break;
        default:
          this.logger.warn(`Unknown event type: ${event}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing event ${event}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  private async handleExportRequested(payload: IExportEventPayload): Promise<void> {
    this.logger.debug(`Export requested: ${payload.exportRequestId}`);
  }

  private async handleExportStarted(payload: IExportEventPayload): Promise<void> {
    this.logger.debug(`Export started: ${payload.exportExecutionId}`);
  }

  private async handleExportProgress(payload: IExportEventPayload): Promise<void> {
    this.logger.debug(`Export progress: ${payload.exportExecutionId}`, payload.metadata);
  }

  private async handleExportCompleted(payload: IExportEventPayload): Promise<void> {
    this.logger.log(`Export completed: ${payload.exportExecutionId}`);
  }

  private async handleExportFailed(payload: IExportEventPayload): Promise<void> {
    this.logger.error(`Export failed: ${payload.exportExecutionId}`);
  }

  private async handleExportCancelled(payload: IExportEventPayload): Promise<void> {
    this.logger.warn(`Export cancelled: ${payload.exportRequestId}`);
  }

  private async handleExportExpired(payload: IExportEventPayload): Promise<void> {
    this.logger.debug(`Export expired: ${payload.exportExecutionId}`);
  }

  private async handleExportDownloaded(payload: IExportEventPayload): Promise<void> {
    this.logger.debug(`Export downloaded: ${payload.exportExecutionId}`);
  }

  private async handleExportCleanup(payload: IExportEventPayload): Promise<void> {
    this.logger.debug(`Export cleanup triggered`);
  }

  private async handleBulkExportStarted(payload: IExportEventPayload): Promise<void> {
    this.logger.debug(`Bulk export started: ${payload.bulkExportId}`);
  }

  private async handleBulkExportCompleted(payload: IExportEventPayload): Promise<void> {
    this.logger.log(`Bulk export completed: ${payload.bulkExportId}`);
  }
}
