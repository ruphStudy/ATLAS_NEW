import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IAiAnalyticsEvent, AiAnalyticsEventType } from '../interfaces';

@Processor('ai-analytics-events')
export class AiAnalyticsEventWorker extends WorkerHost {
  private readonly logger = new Logger(AiAnalyticsEventWorker.name);

  async process(job: Job<IAiAnalyticsEvent>): Promise<void> {
    const { event, workspaceId, providerKey, modelKey, capability } = job.data;

    this.logger.log(
      `Processing AI analytics event: ${event} for workspace ${workspaceId}`,
    );

    switch (event) {
      case AiAnalyticsEventType.PERFORMANCE_CALCULATED:
        await this.handlePerformanceCalculated(job.data);
        break;
      case AiAnalyticsEventType.TREND_UPDATED:
        await this.handleTrendUpdated(job.data);
        break;
      case AiAnalyticsEventType.COMPARISON_GENERATED:
        await this.handleComparisonGenerated(job.data);
        break;
      case AiAnalyticsEventType.EXPENSIVE_OPERATION_DETECTED:
        await this.handleExpensiveOperationDetected(job.data);
        break;
      case AiAnalyticsEventType.SLOW_OPERATION_DETECTED:
        await this.handleSlowOperationDetected(job.data);
        break;
      case AiAnalyticsEventType.UNRELIABLE_OPERATION_DETECTED:
        await this.handleUnreliableOperationDetected(job.data);
        break;
      case AiAnalyticsEventType.UNDERUSED_OPERATION_DETECTED:
        await this.handleUnderusedOperationDetected(job.data);
        break;
      case AiAnalyticsEventType.BUDGET_WARNING:
        await this.handleBudgetWarning(job.data);
        break;
      case AiAnalyticsEventType.QUOTA_WARNING:
        await this.handleQuotaWarning(job.data);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }

  private async handlePerformanceCalculated(event: IAiAnalyticsEvent): Promise<void> {
    this.logger.debug(`Performance calculated for workspace ${event.workspaceId}`);
  }

  private async handleTrendUpdated(event: IAiAnalyticsEvent): Promise<void> {
    this.logger.debug(`Trend updated for workspace ${event.workspaceId}`);
  }

  private async handleComparisonGenerated(event: IAiAnalyticsEvent): Promise<void> {
    this.logger.debug(`Comparison generated for workspace ${event.workspaceId}`);
  }

  private async handleExpensiveOperationDetected(event: IAiAnalyticsEvent): Promise<void> {
    this.logger.warn(
      `Expensive AI operation detected: provider ${event.providerKey}, model ${event.modelKey}, capability ${event.capability}: ${JSON.stringify(event.metadata)}`,
    );
  }

  private async handleSlowOperationDetected(event: IAiAnalyticsEvent): Promise<void> {
    this.logger.warn(
      `Slow AI operation detected: provider ${event.providerKey}, model ${event.modelKey}, capability ${event.capability}: ${JSON.stringify(event.metadata)}`,
    );
  }

  private async handleUnreliableOperationDetected(event: IAiAnalyticsEvent): Promise<void> {
    this.logger.error(
      `Unreliable AI operation detected: provider ${event.providerKey}, model ${event.modelKey}, capability ${event.capability}: ${JSON.stringify(event.metadata)}`,
    );
  }

  private async handleUnderusedOperationDetected(event: IAiAnalyticsEvent): Promise<void> {
    this.logger.debug(
      `Underused AI operation detected: provider ${event.providerKey}, model ${event.modelKey}, capability ${event.capability}: ${JSON.stringify(event.metadata)}`,
    );
  }

  private async handleBudgetWarning(event: IAiAnalyticsEvent): Promise<void> {
    this.logger.warn(
      `AI budget warning for workspace ${event.workspaceId}: ${JSON.stringify(event.metadata)}`,
    );
  }

  private async handleQuotaWarning(event: IAiAnalyticsEvent): Promise<void> {
    this.logger.warn(
      `AI quota warning for workspace ${event.workspaceId}: ${JSON.stringify(event.metadata)}`,
    );
  }
}
