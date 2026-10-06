import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ISupplierAnalyticsEvent, SupplierAnalyticsEventType } from '../interfaces';

@Processor('supplier-analytics-events')
export class SupplierAnalyticsEventWorker extends WorkerHost {
  private readonly logger = new Logger(SupplierAnalyticsEventWorker.name);

  async process(job: Job<ISupplierAnalyticsEvent>): Promise<void> {
    const { event, workspaceId, supplierId, metadata } = job.data;

    this.logger.log(
      `Processing supplier analytics event: ${event} for workspace ${workspaceId}${supplierId ? `, supplier ${supplierId}` : ''}`,
    );

    switch (event) {
      case SupplierAnalyticsEventType.PERFORMANCE_CALCULATED:
        await this.handlePerformanceCalculated(job.data);
        break;
      case SupplierAnalyticsEventType.TREND_UPDATED:
        await this.handleTrendUpdated(job.data);
        break;
      case SupplierAnalyticsEventType.CATEGORY_CHANGED:
        await this.handleCategoryChanged(job.data);
        break;
      case SupplierAnalyticsEventType.COMPARISON_GENERATED:
        await this.handleComparisonGenerated(job.data);
        break;
      case SupplierAnalyticsEventType.RANKING_UPDATED:
        await this.handleRankingUpdated(job.data);
        break;
      case SupplierAnalyticsEventType.RISKY_DETECTED:
        await this.handleRiskyDetected(job.data);
        break;
      case SupplierAnalyticsEventType.INACTIVE_DETECTED:
        await this.handleInactiveDetected(job.data);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }

  private async handlePerformanceCalculated(event: ISupplierAnalyticsEvent): Promise<void> {
    this.logger.debug(`Performance calculated for workspace ${event.workspaceId}`);
  }

  private async handleTrendUpdated(event: ISupplierAnalyticsEvent): Promise<void> {
    this.logger.debug(`Trend updated for supplier ${event.supplierId}`);
  }

  private async handleCategoryChanged(event: ISupplierAnalyticsEvent): Promise<void> {
    this.logger.debug(`Category changed for supplier ${event.supplierId}`);
  }

  private async handleComparisonGenerated(event: ISupplierAnalyticsEvent): Promise<void> {
    this.logger.debug(`Comparison generated for supplier ${event.supplierId}`);
  }

  private async handleRankingUpdated(event: ISupplierAnalyticsEvent): Promise<void> {
    this.logger.debug(`Ranking updated for workspace ${event.workspaceId}`);
  }

  private async handleRiskyDetected(event: ISupplierAnalyticsEvent): Promise<void> {
    this.logger.debug(`Risky supplier detected: ${event.supplierId}`);
  }

  private async handleInactiveDetected(event: ISupplierAnalyticsEvent): Promise<void> {
    this.logger.debug(`Inactive supplier detected: ${event.supplierId}`);
  }
}
