import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IProcurementAnalyticsEvent, ProcurementAnalyticsEventType } from '../interfaces';

@Processor('procurement-analytics-events')
export class ProcurementAnalyticsEventWorker extends WorkerHost {
  private readonly logger = new Logger(ProcurementAnalyticsEventWorker.name);

  async process(job: Job<IProcurementAnalyticsEvent>): Promise<void> {
    const { event, workspaceId, purchaseOrderId, supplierId, productId } = job.data;

    this.logger.log(
      `Processing procurement analytics event: ${event} for workspace ${workspaceId}`,
    );

    switch (event) {
      case ProcurementAnalyticsEventType.SPEND_CALCULATED:
        await this.handleSpendCalculated(job.data);
        break;
      case ProcurementAnalyticsEventType.SAVINGS_IDENTIFIED:
        await this.handleSavingsIdentified(job.data);
        break;
      case ProcurementAnalyticsEventType.COST_VARIANCE_DETECTED:
        await this.handleCostVarianceDetected(job.data);
        break;
      case ProcurementAnalyticsEventType.DELAYED_PROCUREMENT_DETECTED:
        await this.handleDelayedProcurementDetected(job.data);
        break;
      case ProcurementAnalyticsEventType.HIGH_COST_PROCUREMENT_DETECTED:
        await this.handleHighCostProcurementDetected(job.data);
        break;
      case ProcurementAnalyticsEventType.LOW_QUALITY_DETECTED:
        await this.handleLowQualityDetected(job.data);
        break;
      case ProcurementAnalyticsEventType.INCOMPLETE_PROCUREMENT_DETECTED:
        await this.handleIncompleteProcurementDetected(job.data);
        break;
      case ProcurementAnalyticsEventType.RISKY_PROCUREMENT_DETECTED:
        await this.handleRiskyProcurementDetected(job.data);
        break;
      case ProcurementAnalyticsEventType.PERFORMANCE_CALCULATED:
        await this.handlePerformanceCalculated(job.data);
        break;
      case ProcurementAnalyticsEventType.TREND_UPDATED:
        await this.handleTrendUpdated(job.data);
        break;
      case ProcurementAnalyticsEventType.COMPARISON_GENERATED:
        await this.handleComparisonGenerated(job.data);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }

  private async handleSpendCalculated(event: IProcurementAnalyticsEvent): Promise<void> {
    this.logger.debug(`Spend calculated for workspace ${event.workspaceId}`);
  }

  private async handleSavingsIdentified(event: IProcurementAnalyticsEvent): Promise<void> {
    this.logger.debug(
      `Savings identified for workspace ${event.workspaceId}: ${JSON.stringify(event.metadata)}`,
    );
  }

  private async handleCostVarianceDetected(event: IProcurementAnalyticsEvent): Promise<void> {
    this.logger.warn(
      `Cost variance detected for workspace ${event.workspaceId}, supplier ${event.supplierId}: ${JSON.stringify(event.metadata)}`,
    );
  }

  private async handleDelayedProcurementDetected(event: IProcurementAnalyticsEvent): Promise<void> {
    this.logger.warn(
      `Delayed procurement detected for workspace ${event.workspaceId}, PO ${event.purchaseOrderId}`,
    );
  }

  private async handleHighCostProcurementDetected(event: IProcurementAnalyticsEvent): Promise<void> {
    this.logger.warn(
      `High cost procurement detected for workspace ${event.workspaceId}, supplier ${event.supplierId}`,
    );
  }

  private async handleLowQualityDetected(event: IProcurementAnalyticsEvent): Promise<void> {
    this.logger.error(
      `Low quality detected for workspace ${event.workspaceId}, supplier ${event.supplierId}, product ${event.productId}`,
    );
  }

  private async handleIncompleteProcurementDetected(event: IProcurementAnalyticsEvent): Promise<void> {
    this.logger.warn(
      `Incomplete procurement detected for workspace ${event.workspaceId}, PO ${event.purchaseOrderId}`,
    );
  }

  private async handleRiskyProcurementDetected(event: IProcurementAnalyticsEvent): Promise<void> {
    this.logger.warn(
      `Risky procurement detected for workspace ${event.workspaceId}, supplier ${event.supplierId}`,
    );
  }

  private async handlePerformanceCalculated(event: IProcurementAnalyticsEvent): Promise<void> {
    this.logger.debug(`Performance calculated for workspace ${event.workspaceId}`);
  }

  private async handleTrendUpdated(event: IProcurementAnalyticsEvent): Promise<void> {
    this.logger.debug(`Trend updated for workspace ${event.workspaceId}`);
  }

  private async handleComparisonGenerated(event: IProcurementAnalyticsEvent): Promise<void> {
    this.logger.debug(`Comparison generated for workspace ${event.workspaceId}`);
  }
}
