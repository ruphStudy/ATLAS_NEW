import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IDecisionEventPayload, AiDecisionEvent } from '../interfaces';

@Processor('ai-decision-events')
export class AiDecisionEventWorker extends WorkerHost {
  private readonly logger = new Logger(AiDecisionEventWorker.name);

  async process(job: Job<IDecisionEventPayload>): Promise<void> {
    const { event, workspaceId, decisionId } = job.data;

    this.logger.log(
      `Processing AI Decision event: ${event} for workspace ${workspaceId}`,
    );

    switch (event) {
      case AiDecisionEvent.DECISION_STARTED:
        await this.handleDecisionStarted(job.data);
        break;
      case AiDecisionEvent.DECISION_EVALUATED:
        await this.handleDecisionEvaluated(job.data);
        break;
      case AiDecisionEvent.DECISION_APPROVED:
        await this.handleDecisionApproved(job.data);
        break;
      case AiDecisionEvent.DECISION_REJECTED:
        await this.handleDecisionRejected(job.data);
        break;
      case AiDecisionEvent.DECISION_REVIEW_REQUIRED:
        await this.handleDecisionReviewRequired(job.data);
        break;
      case AiDecisionEvent.DECISION_DEFERRED:
        await this.handleDecisionDeferred(job.data);
        break;
      case AiDecisionEvent.DECISION_OVERRIDDEN:
        await this.handleDecisionOverridden(job.data);
        break;
      case AiDecisionEvent.DECISION_EXPIRED:
        await this.handleDecisionExpired(job.data);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }

  private async handleDecisionStarted(payload: IDecisionEventPayload): Promise<void> {
    this.logger.debug(`Decision started: ${payload.decisionId}`);
  }

  private async handleDecisionEvaluated(payload: IDecisionEventPayload): Promise<void> {
    this.logger.log(
      `Decision evaluated: ${payload.decisionId} - Outcome: ${payload.outcome}`,
    );
  }

  private async handleDecisionApproved(payload: IDecisionEventPayload): Promise<void> {
    this.logger.log(`Decision approved: ${payload.decisionId}`);
  }

  private async handleDecisionRejected(payload: IDecisionEventPayload): Promise<void> {
    this.logger.warn(`Decision rejected: ${payload.decisionId}`);
  }

  private async handleDecisionReviewRequired(payload: IDecisionEventPayload): Promise<void> {
    this.logger.log(`Decision requires review: ${payload.decisionId}`);
  }

  private async handleDecisionDeferred(payload: IDecisionEventPayload): Promise<void> {
    this.logger.log(`Decision deferred: ${payload.decisionId}`);
  }

  private async handleDecisionOverridden(payload: IDecisionEventPayload): Promise<void> {
    this.logger.warn(`Decision overridden: ${payload.decisionId}`);
  }

  private async handleDecisionExpired(payload: IDecisionEventPayload): Promise<void> {
    this.logger.warn(`Decision expired: ${payload.decisionId}`);
  }
}
