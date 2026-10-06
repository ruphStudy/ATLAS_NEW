import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IWarehouseAnalyticsEvent, WarehouseAnalyticsEventType } from '../interfaces';

@Processor('warehouse-analytics-events')
export class WarehouseAnalyticsEventWorker extends WorkerHost {
  private readonly logger = new Logger(WarehouseAnalyticsEventWorker.name);

  async process(job: Job<IWarehouseAnalyticsEvent>): Promise<void> {
    const { event, workspaceId, warehouseId, zoneId } = job.data;

    this.logger.log(
      `Processing warehouse analytics event: ${event} for workspace ${workspaceId}`,
    );

    switch (event) {
      case WarehouseAnalyticsEventType.PERFORMANCE_CALCULATED:
        await this.handlePerformanceCalculated(job.data);
        break;
      case WarehouseAnalyticsEventType.TREND_UPDATED:
        await this.handleTrendUpdated(job.data);
        break;
      case WarehouseAnalyticsEventType.COMPARISON_GENERATED:
        await this.handleComparisonGenerated(job.data);
        break;
      case WarehouseAnalyticsEventType.BOTTLENECK_DETECTED:
        await this.handleBottleneckDetected(job.data);
        break;
      case WarehouseAnalyticsEventType.IDLE_CAPACITY_DETECTED:
        await this.handleIdleCapacityDetected(job.data);
        break;
      case WarehouseAnalyticsEventType.CONGESTION_DETECTED:
        await this.handleCongestionDetected(job.data);
        break;
      case WarehouseAnalyticsEventType.DELAYED_TASK_DETECTED:
        await this.handleDelayedTaskDetected(job.data);
        break;
      case WarehouseAnalyticsEventType.UNDERPERFORMING_AREA_DETECTED:
        await this.handleUnderperformingAreaDetected(job.data);
        break;
      case WarehouseAnalyticsEventType.SLA_BREACH_DETECTED:
        await this.handleSlaBreachDetected(job.data);
        break;
      case WarehouseAnalyticsEventType.BACKLOG_DETECTED:
        await this.handleBacklogDetected(job.data);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }

  private async handlePerformanceCalculated(event: IWarehouseAnalyticsEvent): Promise<void> {
    this.logger.debug(`Performance calculated for workspace ${event.workspaceId}`);
  }

  private async handleTrendUpdated(event: IWarehouseAnalyticsEvent): Promise<void> {
    this.logger.debug(`Trend updated for workspace ${event.workspaceId}`);
  }

  private async handleComparisonGenerated(event: IWarehouseAnalyticsEvent): Promise<void> {
    this.logger.debug(`Comparison generated for workspace ${event.workspaceId}`);
  }

  private async handleBottleneckDetected(event: IWarehouseAnalyticsEvent): Promise<void> {
    this.logger.warn(
      `Bottleneck detected for warehouse ${event.warehouseId}, zone ${event.zoneId}: ${JSON.stringify(event.metadata)}`,
    );
  }

  private async handleIdleCapacityDetected(event: IWarehouseAnalyticsEvent): Promise<void> {
    this.logger.warn(
      `Idle capacity detected for warehouse ${event.warehouseId}, zone ${event.zoneId}: ${JSON.stringify(event.metadata)}`,
    );
  }

  private async handleCongestionDetected(event: IWarehouseAnalyticsEvent): Promise<void> {
    this.logger.warn(
      `Congestion detected for warehouse ${event.warehouseId}, zone ${event.zoneId}: ${JSON.stringify(event.metadata)}`,
    );
  }

  private async handleDelayedTaskDetected(event: IWarehouseAnalyticsEvent): Promise<void> {
    this.logger.warn(
      `Delayed tasks detected for warehouse ${event.warehouseId}, zone ${event.zoneId}: ${JSON.stringify(event.metadata)}`,
    );
  }

  private async handleUnderperformingAreaDetected(event: IWarehouseAnalyticsEvent): Promise<void> {
    this.logger.warn(
      `Underperforming area detected for warehouse ${event.warehouseId}, zone ${event.zoneId}: ${JSON.stringify(event.metadata)}`,
    );
  }

  private async handleSlaBreachDetected(event: IWarehouseAnalyticsEvent): Promise<void> {
    this.logger.error(
      `SLA breach detected for warehouse ${event.warehouseId}, zone ${event.zoneId}: ${JSON.stringify(event.metadata)}`,
    );
  }

  private async handleBacklogDetected(event: IWarehouseAnalyticsEvent): Promise<void> {
    this.logger.warn(
      `Backlog detected for warehouse ${event.warehouseId}, zone ${event.zoneId}: ${JSON.stringify(event.metadata)}`,
    );
  }
}
