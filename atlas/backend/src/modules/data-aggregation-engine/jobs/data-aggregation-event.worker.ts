import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IAggregationEventPayload, AggregationEventType } from '../interfaces';

@Processor('data-aggregation-events')
export class DataAggregationEventWorker extends WorkerHost {
  private readonly logger = new Logger(DataAggregationEventWorker.name);

  async process(job: Job<IAggregationEventPayload>): Promise<void> {
    const { event, workspaceId, definitionId, definitionKey, executionId, metadata } = job.data;

    this.logger.log(
      `Processing event: ${event} for workspace: ${workspaceId}, definition: ${definitionId || definitionKey}, execution: ${executionId}`,
    );

    try {
      switch (event) {
        case AggregationEventType.AGGREGATION_REQUESTED:
          await this.handleAggregationRequested(job.data);
          break;
        case AggregationEventType.AGGREGATION_STARTED:
          await this.handleAggregationStarted(job.data);
          break;
        case AggregationEventType.AGGREGATION_PROGRESS:
          await this.handleAggregationProgress(job.data);
          break;
        case AggregationEventType.AGGREGATION_COMPLETED:
          await this.handleAggregationCompleted(job.data);
          break;
        case AggregationEventType.AGGREGATION_FAILED:
          await this.handleAggregationFailed(job.data);
          break;
        case AggregationEventType.BACKFILL_STARTED:
          await this.handleBackfillStarted(job.data);
          break;
        case AggregationEventType.BACKFILL_COMPLETED:
          await this.handleBackfillCompleted(job.data);
          break;
        case AggregationEventType.SNAPSHOT_CREATED:
          await this.handleSnapshotCreated(job.data);
          break;
        case AggregationEventType.AGGREGATION_INVALIDATED:
          await this.handleAggregationInvalidated(job.data);
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

  private async handleAggregationRequested(payload: IAggregationEventPayload): Promise<void> {
    this.logger.debug(`Aggregation requested: ${payload.definitionId}`);
  }

  private async handleAggregationStarted(payload: IAggregationEventPayload): Promise<void> {
    this.logger.debug(`Aggregation started: ${payload.executionId}`);
  }

  private async handleAggregationProgress(payload: IAggregationEventPayload): Promise<void> {
    this.logger.debug(`Aggregation progress: ${payload.executionId}`, payload.metadata);
  }

  private async handleAggregationCompleted(payload: IAggregationEventPayload): Promise<void> {
    this.logger.log(`Aggregation completed: ${payload.executionId}`);
  }

  private async handleAggregationFailed(payload: IAggregationEventPayload): Promise<void> {
    this.logger.error(`Aggregation failed: ${payload.executionId}`);
  }

  private async handleBackfillStarted(payload: IAggregationEventPayload): Promise<void> {
    this.logger.debug(`Backfill started: ${payload.definitionId}`);
  }

  private async handleBackfillCompleted(payload: IAggregationEventPayload): Promise<void> {
    this.logger.log(`Backfill completed: ${payload.definitionId}`);
  }

  private async handleSnapshotCreated(payload: IAggregationEventPayload): Promise<void> {
    this.logger.debug(`Snapshot created for execution: ${payload.executionId}`);
  }

  private async handleAggregationInvalidated(payload: IAggregationEventPayload): Promise<void> {
    this.logger.warn(`Aggregation invalidated: ${payload.definitionId}`);
  }
}
