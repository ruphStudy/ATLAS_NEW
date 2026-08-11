import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ISalesAnalyticsEvent, SalesAnalyticsEventType } from '../interfaces';

@Processor('sales-analytics-events')
export class SalesAnalyticsEventWorker extends WorkerHost {
  private readonly logger = new Logger(SalesAnalyticsEventWorker.name);

  async process(job: Job<ISalesAnalyticsEvent>): Promise<void> {
    const event = job.data;

    this.logger.debug(
      `Processing event: ${event.event} for workspace ${event.workspaceId}`,
    );

    try {
      switch (event.event) {
        case SalesAnalyticsEventType.SALES_DATA_REFRESHED:
          await this.handleSalesDataRefreshed(event);
          break;

        case SalesAnalyticsEventType.TREND_CALCULATED:
          await this.handleTrendCalculated(event);
          break;

        case SalesAnalyticsEventType.BREAKDOWN_GENERATED:
          await this.handleBreakdownGenerated(event);
          break;

        case SalesAnalyticsEventType.TARGET_UPDATED:
          await this.handleTargetUpdated(event);
          break;

        case SalesAnalyticsEventType.VIEW_SAVED:
          await this.handleViewSaved(event);
          break;

        case SalesAnalyticsEventType.REPORT_EXPORTED:
          await this.handleReportExported(event);
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

  private async handleSalesDataRefreshed(event: ISalesAnalyticsEvent): Promise<void> {
    this.logger.log(`Sales data refreshed for workspace ${event.workspaceId}`);
  }

  private async handleTrendCalculated(event: ISalesAnalyticsEvent): Promise<void> {
    this.logger.log(`Trend calculated for workspace ${event.workspaceId}`);
  }

  private async handleBreakdownGenerated(event: ISalesAnalyticsEvent): Promise<void> {
    this.logger.log(`Breakdown generated for workspace ${event.workspaceId}`);
  }

  private async handleTargetUpdated(event: ISalesAnalyticsEvent): Promise<void> {
    this.logger.log(`Target updated for workspace ${event.workspaceId}`);
  }

  private async handleViewSaved(event: ISalesAnalyticsEvent): Promise<void> {
    this.logger.log(`View saved for workspace ${event.workspaceId}`);
  }

  private async handleReportExported(event: ISalesAnalyticsEvent): Promise<void> {
    this.logger.log(`Report exported for workspace ${event.workspaceId}`);
  }
}
