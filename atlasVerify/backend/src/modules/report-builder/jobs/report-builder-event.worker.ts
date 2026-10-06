import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IReportEvent, ReportEventType } from '../interfaces';

@Processor('report-builder-events')
export class ReportBuilderEventWorker extends WorkerHost {
  private readonly logger = new Logger(ReportBuilderEventWorker.name);

  async process(job: Job<IReportEvent>): Promise<void> {
    const event = job.data;

    this.logger.debug(
      `Processing event: ${event.event} for workspace ${event.workspaceId}`,
    );

    try {
      switch (event.event) {
        case ReportEventType.REPORT_CREATED:
          await this.handleReportCreated(event);
          break;

        case ReportEventType.REPORT_UPDATED:
          await this.handleReportUpdated(event);
          break;

        case ReportEventType.REPORT_CLONED:
          await this.handleReportCloned(event);
          break;

        case ReportEventType.REPORT_PUBLISHED:
          await this.handleReportPublished(event);
          break;

        case ReportEventType.REPORT_ARCHIVED:
          await this.handleReportArchived(event);
          break;

        case ReportEventType.REPORT_RESTORED:
          await this.handleReportRestored(event);
          break;

        case ReportEventType.REPORT_EXECUTED:
          await this.handleReportExecuted(event);
          break;

        case ReportEventType.EXECUTION_STARTED:
          await this.handleExecutionStarted(event);
          break;

        case ReportEventType.EXECUTION_COMPLETED:
          await this.handleExecutionCompleted(event);
          break;

        case ReportEventType.EXECUTION_FAILED:
          await this.handleExecutionFailed(event);
          break;

        case ReportEventType.VERSION_CREATED:
          await this.handleVersionCreated(event);
          break;

        case ReportEventType.TEMPLATE_CREATED:
          await this.handleTemplateCreated(event);
          break;

        default:
          this.logger.warn(`Unhandled event type: ${event.event}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing event ${event.event}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  private async handleReportCreated(event: IReportEvent): Promise<void> {
    this.logger.log(`Report created: ${event.reportKey} for workspace ${event.workspaceId}`);
  }

  private async handleReportUpdated(event: IReportEvent): Promise<void> {
    this.logger.log(`Report updated: ${event.reportKey} for workspace ${event.workspaceId}`);
  }

  private async handleReportCloned(event: IReportEvent): Promise<void> {
    this.logger.log(`Report cloned: ${event.reportKey} for workspace ${event.workspaceId}`);
  }

  private async handleReportPublished(event: IReportEvent): Promise<void> {
    this.logger.log(`Report published: ${event.reportKey} for workspace ${event.workspaceId}`);
  }

  private async handleReportArchived(event: IReportEvent): Promise<void> {
    this.logger.log(`Report archived: ${event.reportKey} for workspace ${event.workspaceId}`);
  }

  private async handleReportRestored(event: IReportEvent): Promise<void> {
    this.logger.log(`Report restored: ${event.reportKey} for workspace ${event.workspaceId}`);
  }

  private async handleReportExecuted(event: IReportEvent): Promise<void> {
    this.logger.log(`Report executed: ${event.reportKey} for workspace ${event.workspaceId}`);
  }

  private async handleExecutionStarted(event: IReportEvent): Promise<void> {
    this.logger.log(`Execution started for report: ${event.reportKey} in workspace ${event.workspaceId}`);
  }

  private async handleExecutionCompleted(event: IReportEvent): Promise<void> {
    this.logger.log(`Execution completed for report: ${event.reportKey} in workspace ${event.workspaceId}`);
  }

  private async handleExecutionFailed(event: IReportEvent): Promise<void> {
    this.logger.log(`Execution failed for report: ${event.reportKey} in workspace ${event.workspaceId}`);
  }

  private async handleVersionCreated(event: IReportEvent): Promise<void> {
    this.logger.log(`Version created for report: ${event.reportKey} in workspace ${event.workspaceId}`);
  }

  private async handleTemplateCreated(event: IReportEvent): Promise<void> {
    this.logger.log(`Template created for workspace ${event.workspaceId}`);
  }
}
