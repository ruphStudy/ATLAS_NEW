import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IProfitAnalyticsEvent, ProfitAnalyticsEventType } from '../interfaces';

@Processor('profit-analytics-events')
export class ProfitAnalyticsEventWorker extends WorkerHost {
  private readonly logger = new Logger(ProfitAnalyticsEventWorker.name);

  async process(job: Job<IProfitAnalyticsEvent>): Promise<void> {
    const { event, workspaceId, metadata } = job.data;

    this.logger.log(
      `Processing profit analytics event: ${event} for workspace ${workspaceId}`,
    );

    switch (event) {
      case ProfitAnalyticsEventType.PROFIT_CALCULATED:
        await this.handleProfitCalculated(job.data);
        break;
      case ProfitAnalyticsEventType.MARGIN_UPDATED:
        await this.handleMarginUpdated(job.data);
        break;
      case ProfitAnalyticsEventType.TARGET_ACHIEVED:
        await this.handleTargetAchieved(job.data);
        break;
      case ProfitAnalyticsEventType.TARGET_MISSED:
        await this.handleTargetMissed(job.data);
        break;
      case ProfitAnalyticsEventType.LEAKAGE_DETECTED:
        await this.handleLeakageDetected(job.data);
        break;
      case ProfitAnalyticsEventType.PROFITABILITY_CHANGED:
        await this.handleProfitabilityChanged(job.data);
        break;
      case ProfitAnalyticsEventType.COMPARISON_GENERATED:
        await this.handleComparisonGenerated(job.data);
        break;
      case ProfitAnalyticsEventType.BREAKDOWN_CALCULATED:
        await this.handleBreakdownCalculated(job.data);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }

  private async handleProfitCalculated(event: IProfitAnalyticsEvent): Promise<void> {
    this.logger.debug(`Profit calculated for workspace ${event.workspaceId}`);
  }

  private async handleMarginUpdated(event: IProfitAnalyticsEvent): Promise<void> {
    this.logger.debug(`Margin updated for workspace ${event.workspaceId}`);
  }

  private async handleTargetAchieved(event: IProfitAnalyticsEvent): Promise<void> {
    this.logger.debug(`Target achieved for workspace ${event.workspaceId}`);
  }

  private async handleTargetMissed(event: IProfitAnalyticsEvent): Promise<void> {
    this.logger.debug(`Target missed for workspace ${event.workspaceId}`);
  }

  private async handleLeakageDetected(event: IProfitAnalyticsEvent): Promise<void> {
    this.logger.debug(`Leakage detected for workspace ${event.workspaceId}`);
  }

  private async handleProfitabilityChanged(event: IProfitAnalyticsEvent): Promise<void> {
    this.logger.debug(`Profitability changed for workspace ${event.workspaceId}`);
  }

  private async handleComparisonGenerated(event: IProfitAnalyticsEvent): Promise<void> {
    this.logger.debug(`Comparison generated for workspace ${event.workspaceId}`);
  }

  private async handleBreakdownCalculated(event: IProfitAnalyticsEvent): Promise<void> {
    this.logger.debug(`Breakdown calculated for workspace ${event.workspaceId}`);
  }
}
