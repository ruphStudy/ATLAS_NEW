import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IRetryEventPayload, AiRetryEvent } from '../interfaces';

@Processor('ai-retry-events')
export class AiRetryEventWorker extends WorkerHost {
  private readonly logger = new Logger(AiRetryEventWorker.name);

  async process(job: Job<IRetryEventPayload>): Promise<void> {
    const { event, workspaceId, retryExecutionId } = job.data;

    this.logger.log(
      `Processing AI Retry event: ${event} for workspace ${workspaceId}`,
    );

    switch (event) {
      case AiRetryEvent.RETRY_STARTED:
        await this.handleRetryStarted(job.data);
        break;
      case AiRetryEvent.RETRY_ATTEMPT:
        await this.handleRetryAttempt(job.data);
        break;
      case AiRetryEvent.RETRY_SUCCEEDED:
        await this.handleRetrySucceeded(job.data);
        break;
      case AiRetryEvent.RETRY_FAILED:
        await this.handleRetryFailed(job.data);
        break;
      case AiRetryEvent.RETRY_EXHAUSTED:
        await this.handleRetryExhausted(job.data);
        break;
      case AiRetryEvent.FALLBACK_TRIGGERED:
        await this.handleFallbackTriggered(job.data);
        break;
      case AiRetryEvent.FALLBACK_SUCCEEDED:
        await this.handleFallbackSucceeded(job.data);
        break;
      case AiRetryEvent.FALLBACK_FAILED:
        await this.handleFallbackFailed(job.data);
        break;
      case AiRetryEvent.RECOVERY_COMPLETED:
        await this.handleRecoveryCompleted(job.data);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }

  private async handleRetryStarted(payload: IRetryEventPayload): Promise<void> {
    this.logger.debug(`Retry started: ${payload.retryExecutionId}`);
  }

  private async handleRetryAttempt(payload: IRetryEventPayload): Promise<void> {
    this.logger.log(
      `Retry attempt ${payload.attemptNumber} for: ${payload.retryExecutionId}`,
    );
  }

  private async handleRetrySucceeded(payload: IRetryEventPayload): Promise<void> {
    this.logger.log(`Retry succeeded: ${payload.retryExecutionId}`);
  }

  private async handleRetryFailed(payload: IRetryEventPayload): Promise<void> {
    this.logger.warn(`Retry failed: ${payload.retryExecutionId}`);
  }

  private async handleRetryExhausted(payload: IRetryEventPayload): Promise<void> {
    this.logger.error(`Retry exhausted: ${payload.retryExecutionId}`);
  }

  private async handleFallbackTriggered(
    payload: IRetryEventPayload,
  ): Promise<void> {
    this.logger.log(`Fallback triggered for: ${payload.retryExecutionId}`);
  }

  private async handleFallbackSucceeded(
    payload: IRetryEventPayload,
  ): Promise<void> {
    this.logger.log(`Fallback succeeded for: ${payload.retryExecutionId}`);
  }

  private async handleFallbackFailed(payload: IRetryEventPayload): Promise<void> {
    this.logger.warn(`Fallback failed for: ${payload.retryExecutionId}`);
  }

  private async handleRecoveryCompleted(
    payload: IRetryEventPayload,
  ): Promise<void> {
    this.logger.log(`Recovery completed: ${payload.retryExecutionId}`);
  }
}
