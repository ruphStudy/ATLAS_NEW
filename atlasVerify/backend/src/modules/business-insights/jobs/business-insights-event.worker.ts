import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IInsightEventPayload, InsightEventType } from '../interfaces';

@Processor('business-insights-events')
export class BusinessInsightsEventWorker extends WorkerHost {
  private readonly logger = new Logger(BusinessInsightsEventWorker.name);

  async process(job: Job<IInsightEventPayload>): Promise<void> {
    const { event, workspaceId, insightId, insightKey, domain, type, priority, status, metadata } = job.data;

    this.logger.log(
      `Processing event: ${event} for workspace: ${workspaceId}, insight: ${insightId || insightKey}`,
    );

    try {
      switch (event) {
        case InsightEventType.INSIGHT_GENERATED:
          await this.handleInsightGenerated(job.data);
          break;
        case InsightEventType.INSIGHT_REVIEWED:
          await this.handleInsightReviewed(job.data);
          break;
        case InsightEventType.INSIGHT_ACCEPTED:
          await this.handleInsightAccepted(job.data);
          break;
        case InsightEventType.INSIGHT_DISMISSED:
          await this.handleInsightDismissed(job.data);
          break;
        case InsightEventType.INSIGHT_RESOLVED:
          await this.handleInsightResolved(job.data);
          break;
        case InsightEventType.INSIGHT_EXPIRED:
          await this.handleInsightExpired(job.data);
          break;
        case InsightEventType.PRIORITY_CHANGED:
          await this.handlePriorityChanged(job.data);
          break;
        case InsightEventType.DUPLICATE_DETECTED:
          await this.handleDuplicateDetected(job.data);
          break;
        case InsightEventType.OUTCOME_RECORDED:
          await this.handleOutcomeRecorded(job.data);
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

  private async handleInsightGenerated(payload: IInsightEventPayload): Promise<void> {
    this.logger.log(`Insight generated: ${payload.insightId} (${payload.domain}/${payload.type})`);
  }

  private async handleInsightReviewed(payload: IInsightEventPayload): Promise<void> {
    this.logger.debug(`Insight reviewed: ${payload.insightId}`);
  }

  private async handleInsightAccepted(payload: IInsightEventPayload): Promise<void> {
    this.logger.log(`Insight accepted: ${payload.insightId}`);
  }

  private async handleInsightDismissed(payload: IInsightEventPayload): Promise<void> {
    this.logger.log(`Insight dismissed: ${payload.insightId}`);
  }

  private async handleInsightResolved(payload: IInsightEventPayload): Promise<void> {
    this.logger.log(`Insight resolved: ${payload.insightId}`);
  }

  private async handleInsightExpired(payload: IInsightEventPayload): Promise<void> {
    this.logger.warn(`Insight expired: ${payload.insightId}`);
  }

  private async handlePriorityChanged(payload: IInsightEventPayload): Promise<void> {
    this.logger.log(`Insight priority changed: ${payload.insightId} -> ${payload.priority}`);
  }

  private async handleDuplicateDetected(payload: IInsightEventPayload): Promise<void> {
    this.logger.warn(`Duplicate insight detected: ${payload.insightId}`);
  }

  private async handleOutcomeRecorded(payload: IInsightEventPayload): Promise<void> {
    this.logger.log(`Outcome recorded for insight: ${payload.insightId}`);
  }
}
