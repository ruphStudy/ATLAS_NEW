import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IAnalyticsApiEventPayload, AnalyticsApiEventType } from '../interfaces';

@Processor('analytics-api-events')
export class AnalyticsApiEventWorker extends WorkerHost {
  private readonly logger = new Logger(AnalyticsApiEventWorker.name);

  async process(job: Job<IAnalyticsApiEventPayload>): Promise<void> {
    const { event, workspaceId, endpoint, version, asyncOperationId, statusCode, duration, metadata } = job.data;

    this.logger.log(
      `Processing event: ${event} for workspace: ${workspaceId}, endpoint: ${endpoint}`,
    );

    try {
      switch (event) {
        case AnalyticsApiEventType.API_REQUEST_RECEIVED:
          await this.handleApiRequestReceived(job.data);
          break;
        case AnalyticsApiEventType.API_RESPONSE_SENT:
          await this.handleApiResponseSent(job.data);
          break;
        case AnalyticsApiEventType.ASYNC_OPERATION_STARTED:
          await this.handleAsyncOperationStarted(job.data);
          break;
        case AnalyticsApiEventType.ASYNC_OPERATION_COMPLETED:
          await this.handleAsyncOperationCompleted(job.data);
          break;
        case AnalyticsApiEventType.RATE_LIMIT_EXCEEDED:
          await this.handleRateLimitExceeded(job.data);
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

  private async handleApiRequestReceived(payload: IAnalyticsApiEventPayload): Promise<void> {
    this.logger.debug(
      `API request received: ${payload.endpoint} (${payload.version})`,
    );
  }

  private async handleApiResponseSent(payload: IAnalyticsApiEventPayload): Promise<void> {
    this.logger.debug(
      `API response sent: ${payload.endpoint} (status: ${payload.statusCode}, duration: ${payload.duration}ms)`,
    );
  }

  private async handleAsyncOperationStarted(payload: IAnalyticsApiEventPayload): Promise<void> {
    this.logger.log(
      `Async operation started: ${payload.asyncOperationId} (${payload.endpoint})`,
    );
  }

  private async handleAsyncOperationCompleted(payload: IAnalyticsApiEventPayload): Promise<void> {
    this.logger.log(
      `Async operation completed: ${payload.asyncOperationId} (${payload.endpoint})`,
    );
  }

  private async handleRateLimitExceeded(payload: IAnalyticsApiEventPayload): Promise<void> {
    this.logger.warn(
      `Rate limit exceeded for workspace: ${payload.workspaceId}, endpoint: ${payload.endpoint}`,
      payload.metadata,
    );
  }
}
