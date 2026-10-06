import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IOrchestratorEventPayload, AiOrchestratorEvent } from '../interfaces';

@Processor('ai-orchestrator-events')
export class AiOrchestratorEventWorker extends WorkerHost {
  private readonly logger = new Logger(AiOrchestratorEventWorker.name);

  async process(job: Job<IOrchestratorEventPayload>): Promise<void> {
    const { event, workspaceId, requestId } = job.data;

    this.logger.log(
      `Processing AI Orchestrator event: ${event} for request ${requestId} in workspace ${workspaceId}`,
    );

    switch (event) {
      case AiOrchestratorEvent.REQUEST_RECEIVED:
        await this.handleRequestReceived(job.data);
        break;
      case AiOrchestratorEvent.EXECUTION_STARTED:
        await this.handleExecutionStarted(job.data);
        break;
      case AiOrchestratorEvent.EXECUTION_COMPLETED:
        await this.handleExecutionCompleted(job.data);
        break;
      case AiOrchestratorEvent.EXECUTION_FAILED:
        await this.handleExecutionFailed(job.data);
        break;
      case AiOrchestratorEvent.FALLBACK_TRIGGERED:
        await this.handleFallbackTriggered(job.data);
        break;
      case AiOrchestratorEvent.RETRY_ATTEMPTED:
        await this.handleRetryAttempted(job.data);
        break;
      case AiOrchestratorEvent.CACHE_HIT:
        await this.handleCacheHit(job.data);
        break;
      case AiOrchestratorEvent.CACHE_MISS:
        await this.handleCacheMiss(job.data);
        break;
      case AiOrchestratorEvent.RESPONSE_NORMALIZED:
        await this.handleResponseNormalized(job.data);
        break;
      case AiOrchestratorEvent.REQUEST_CANCELLED:
        await this.handleRequestCancelled(job.data);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }

  private async handleRequestReceived(
    payload: IOrchestratorEventPayload,
  ): Promise<void> {
    this.logger.debug(`Request received: ${payload.requestId}`);
  }

  private async handleExecutionStarted(
    payload: IOrchestratorEventPayload,
  ): Promise<void> {
    this.logger.debug(
      `Execution started for request: ${payload.requestId} with provider: ${payload.provider}`,
    );
  }

  private async handleExecutionCompleted(
    payload: IOrchestratorEventPayload,
  ): Promise<void> {
    this.logger.debug(
      `Execution completed for request: ${payload.requestId} in ${payload.latency}ms, cost: ${payload.cost}`,
    );
  }

  private async handleExecutionFailed(
    payload: IOrchestratorEventPayload,
  ): Promise<void> {
    this.logger.warn(
      `Execution failed for request: ${payload.requestId}, error: ${payload.errorCode}`,
    );
  }

  private async handleFallbackTriggered(
    payload: IOrchestratorEventPayload,
  ): Promise<void> {
    this.logger.log(
      `Fallback triggered for request: ${payload.requestId}, attempt: ${payload.attemptNumber}`,
    );
  }

  private async handleRetryAttempted(
    payload: IOrchestratorEventPayload,
  ): Promise<void> {
    this.logger.log(
      `Retry attempted for request: ${payload.requestId}, attempt: ${payload.attemptNumber}`,
    );
  }

  private async handleCacheHit(
    payload: IOrchestratorEventPayload,
  ): Promise<void> {
    this.logger.debug(`Cache hit for request: ${payload.requestId}`);
  }

  private async handleCacheMiss(
    payload: IOrchestratorEventPayload,
  ): Promise<void> {
    this.logger.debug(`Cache miss for request: ${payload.requestId}`);
  }

  private async handleResponseNormalized(
    payload: IOrchestratorEventPayload,
  ): Promise<void> {
    this.logger.debug(`Response normalized for request: ${payload.requestId}`);
  }

  private async handleRequestCancelled(
    payload: IOrchestratorEventPayload,
  ): Promise<void> {
    this.logger.log(`Request cancelled: ${payload.requestId}`);
  }
}
