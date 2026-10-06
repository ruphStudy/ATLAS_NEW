import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  IRecommendationEventPayload,
  AiRecommendationEvent,
} from '../interfaces';

@Processor('ai-recommendation-events')
export class AiRecommendationEventWorker extends WorkerHost {
  private readonly logger = new Logger(AiRecommendationEventWorker.name);

  async process(job: Job<IRecommendationEventPayload>): Promise<void> {
    const { event, workspaceId, recommendationId } = job.data;

    this.logger.log(
      `Processing AI Recommendation event: ${event} for workspace ${workspaceId}`,
    );

    switch (event) {
      case AiRecommendationEvent.RECOMMENDATION_STARTED:
        await this.handleRecommendationStarted(job.data);
        break;
      case AiRecommendationEvent.RECOMMENDATION_GENERATED:
        await this.handleRecommendationGenerated(job.data);
        break;
      case AiRecommendationEvent.RECOMMENDATION_ACCEPTED:
        await this.handleRecommendationAccepted(job.data);
        break;
      case AiRecommendationEvent.RECOMMENDATION_REJECTED:
        await this.handleRecommendationRejected(job.data);
        break;
      case AiRecommendationEvent.RECOMMENDATION_DISMISSED:
        await this.handleRecommendationDismissed(job.data);
        break;
      case AiRecommendationEvent.RECOMMENDATION_DEFERRED:
        await this.handleRecommendationDeferred(job.data);
        break;
      case AiRecommendationEvent.RECOMMENDATION_FEEDBACK:
        await this.handleRecommendationFeedback(job.data);
        break;
      case AiRecommendationEvent.RECOMMENDATION_OUTCOME_TRACKED:
        await this.handleRecommendationOutcomeTracked(job.data);
        break;
      case AiRecommendationEvent.RECOMMENDATION_EXPIRED:
        await this.handleRecommendationExpired(job.data);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }

  private async handleRecommendationStarted(
    payload: IRecommendationEventPayload,
  ): Promise<void> {
    this.logger.debug(`Recommendation started: ${payload.recommendationId}`);
  }

  private async handleRecommendationGenerated(
    payload: IRecommendationEventPayload,
  ): Promise<void> {
    this.logger.log(`Recommendation generated: ${payload.recommendationId}`);
  }

  private async handleRecommendationAccepted(
    payload: IRecommendationEventPayload,
  ): Promise<void> {
    this.logger.log(`Recommendation accepted: ${payload.recommendationId}`);
  }

  private async handleRecommendationRejected(
    payload: IRecommendationEventPayload,
  ): Promise<void> {
    this.logger.warn(`Recommendation rejected: ${payload.recommendationId}`);
  }

  private async handleRecommendationDismissed(
    payload: IRecommendationEventPayload,
  ): Promise<void> {
    this.logger.log(`Recommendation dismissed: ${payload.recommendationId}`);
  }

  private async handleRecommendationDeferred(
    payload: IRecommendationEventPayload,
  ): Promise<void> {
    this.logger.log(`Recommendation deferred: ${payload.recommendationId}`);
  }

  private async handleRecommendationFeedback(
    payload: IRecommendationEventPayload,
  ): Promise<void> {
    this.logger.log(
      `Recommendation feedback received: ${payload.recommendationId}`,
    );
  }

  private async handleRecommendationOutcomeTracked(
    payload: IRecommendationEventPayload,
  ): Promise<void> {
    this.logger.log(
      `Recommendation outcome tracked: ${payload.recommendationId}`,
    );
  }

  private async handleRecommendationExpired(
    payload: IRecommendationEventPayload,
  ): Promise<void> {
    this.logger.warn(`Recommendation expired: ${payload.recommendationId}`);
  }
}
