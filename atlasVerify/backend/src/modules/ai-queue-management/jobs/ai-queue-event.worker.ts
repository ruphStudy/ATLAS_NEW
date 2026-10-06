import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IQueueEventPayload, AiQueueEvent } from '../interfaces';

@Processor('ai-queue-events')
export class AiQueueEventWorker extends WorkerHost {
  private readonly logger = new Logger(AiQueueEventWorker.name);

  async process(job: Job<IQueueEventPayload>): Promise<void> {
    const { event, queueId, queueJobId } = job.data;

    this.logger.log(
      `Processing AI Queue event: ${event} for queue ${queueId}`,
    );

    switch (event) {
      case AiQueueEvent.QUEUE_CREATED:
        await this.handleQueueCreated(job.data);
        break;
      case AiQueueEvent.QUEUE_UPDATED:
        await this.handleQueueUpdated(job.data);
        break;
      case AiQueueEvent.QUEUE_PAUSED:
        await this.handleQueuePaused(job.data);
        break;
      case AiQueueEvent.QUEUE_RESUMED:
        await this.handleQueueResumed(job.data);
        break;
      case AiQueueEvent.QUEUE_DRAINED:
        await this.handleQueueDrained(job.data);
        break;
      case AiQueueEvent.QUEUE_STOPPED:
        await this.handleQueueStopped(job.data);
        break;
      case AiQueueEvent.JOB_ENQUEUED:
        await this.handleJobEnqueued(job.data);
        break;
      case AiQueueEvent.JOB_STARTED:
        await this.handleJobStarted(job.data);
        break;
      case AiQueueEvent.JOB_PROGRESS:
        await this.handleJobProgress(job.data);
        break;
      case AiQueueEvent.JOB_COMPLETED:
        await this.handleJobCompleted(job.data);
        break;
      case AiQueueEvent.JOB_FAILED:
        await this.handleJobFailed(job.data);
        break;
      case AiQueueEvent.JOB_RETRYING:
        await this.handleJobRetrying(job.data);
        break;
      case AiQueueEvent.JOB_CANCELLED:
        await this.handleJobCancelled(job.data);
        break;
      case AiQueueEvent.JOB_DEAD_LETTER:
        await this.handleJobDeadLetter(job.data);
        break;
      case AiQueueEvent.BATCH_STARTED:
        await this.handleBatchStarted(job.data);
        break;
      case AiQueueEvent.BATCH_COMPLETED:
        await this.handleBatchCompleted(job.data);
        break;
      case AiQueueEvent.METRICS_UPDATED:
        await this.handleMetricsUpdated(job.data);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }

  private async handleQueueCreated(payload: IQueueEventPayload): Promise<void> {
    this.logger.debug(`Queue created: ${payload.queueId}`);
  }

  private async handleQueueUpdated(payload: IQueueEventPayload): Promise<void> {
    this.logger.debug(`Queue updated: ${payload.queueId}`);
  }

  private async handleQueuePaused(payload: IQueueEventPayload): Promise<void> {
    this.logger.log(`Queue paused: ${payload.queueId}`);
  }

  private async handleQueueResumed(payload: IQueueEventPayload): Promise<void> {
    this.logger.log(`Queue resumed: ${payload.queueId}`);
  }

  private async handleQueueDrained(payload: IQueueEventPayload): Promise<void> {
    this.logger.log(`Queue drained: ${payload.queueId}`);
  }

  private async handleQueueStopped(payload: IQueueEventPayload): Promise<void> {
    this.logger.log(`Queue stopped: ${payload.queueId}`);
  }

  private async handleJobEnqueued(payload: IQueueEventPayload): Promise<void> {
    this.logger.debug(`Job enqueued: ${payload.queueJobId}`);
  }

  private async handleJobStarted(payload: IQueueEventPayload): Promise<void> {
    this.logger.debug(`Job started: ${payload.queueJobId}`);
  }

  private async handleJobProgress(payload: IQueueEventPayload): Promise<void> {
    this.logger.debug(`Job progress: ${payload.queueJobId} - ${payload.progress}%`);
  }

  private async handleJobCompleted(payload: IQueueEventPayload): Promise<void> {
    this.logger.debug(`Job completed: ${payload.queueJobId}`);
  }

  private async handleJobFailed(payload: IQueueEventPayload): Promise<void> {
    this.logger.warn(`Job failed: ${payload.queueJobId}`);
  }

  private async handleJobRetrying(payload: IQueueEventPayload): Promise<void> {
    this.logger.log(`Job retrying: ${payload.queueJobId}`);
  }

  private async handleJobCancelled(payload: IQueueEventPayload): Promise<void> {
    this.logger.log(`Job cancelled: ${payload.queueJobId}`);
  }

  private async handleJobDeadLetter(payload: IQueueEventPayload): Promise<void> {
    this.logger.warn(`Job moved to dead letter: ${payload.queueJobId}`);
  }

  private async handleBatchStarted(payload: IQueueEventPayload): Promise<void> {
    this.logger.log(`Batch started: ${payload.batchId}`);
  }

  private async handleBatchCompleted(payload: IQueueEventPayload): Promise<void> {
    this.logger.log(`Batch completed: ${payload.batchId}`);
  }

  private async handleMetricsUpdated(payload: IQueueEventPayload): Promise<void> {
    this.logger.debug(`Metrics updated for queue: ${payload.queueId}`);
  }
}
