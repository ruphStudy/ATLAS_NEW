import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IJobEventPayload, AiJobEvent } from '../interfaces';

@Processor('ai-job-events')
export class AiJobEventWorker extends WorkerHost {
  private readonly logger = new Logger(AiJobEventWorker.name);

  async process(job: Job<IJobEventPayload>): Promise<void> {
    const { event, workspaceId, jobId, executionId } = job.data;

    this.logger.log(
      `Processing AI Job event: ${event} for workspace ${workspaceId}`,
    );

    switch (event) {
      case AiJobEvent.JOB_CREATED:
        await this.handleJobCreated(job.data);
        break;
      case AiJobEvent.JOB_UPDATED:
        await this.handleJobUpdated(job.data);
        break;
      case AiJobEvent.JOB_SCHEDULED:
        await this.handleJobScheduled(job.data);
        break;
      case AiJobEvent.JOB_QUEUED:
        await this.handleJobQueued(job.data);
        break;
      case AiJobEvent.JOB_STARTED:
        await this.handleJobStarted(job.data);
        break;
      case AiJobEvent.JOB_PROGRESS:
        await this.handleJobProgress(job.data);
        break;
      case AiJobEvent.JOB_COMPLETED:
        await this.handleJobCompleted(job.data);
        break;
      case AiJobEvent.JOB_FAILED:
        await this.handleJobFailed(job.data);
        break;
      case AiJobEvent.JOB_CANCELLED:
        await this.handleJobCancelled(job.data);
        break;
      case AiJobEvent.JOB_PAUSED:
        await this.handleJobPaused(job.data);
        break;
      case AiJobEvent.JOB_RESUMED:
        await this.handleJobResumed(job.data);
        break;
      case AiJobEvent.JOB_RETRYING:
        await this.handleJobRetrying(job.data);
        break;
      case AiJobEvent.JOB_TIMEOUT:
        await this.handleJobTimeout(job.data);
        break;
      case AiJobEvent.JOB_ARCHIVED:
        await this.handleJobArchived(job.data);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }

  private async handleJobCreated(payload: IJobEventPayload): Promise<void> {
    this.logger.debug(`Job created: ${payload.jobId}`);
  }

  private async handleJobUpdated(payload: IJobEventPayload): Promise<void> {
    this.logger.debug(`Job updated: ${payload.jobId}`);
  }

  private async handleJobScheduled(payload: IJobEventPayload): Promise<void> {
    this.logger.debug(`Job scheduled: ${payload.jobId}`);
  }

  private async handleJobQueued(payload: IJobEventPayload): Promise<void> {
    this.logger.debug(`Job queued: ${payload.jobId}`);
  }

  private async handleJobStarted(payload: IJobEventPayload): Promise<void> {
    this.logger.debug(`Job started: ${payload.executionId}`);
  }

  private async handleJobProgress(payload: IJobEventPayload): Promise<void> {
    this.logger.debug(`Job progress: ${payload.executionId} - ${payload.progress}%`);
  }

  private async handleJobCompleted(payload: IJobEventPayload): Promise<void> {
    this.logger.debug(`Job completed: ${payload.executionId}`);
  }

  private async handleJobFailed(payload: IJobEventPayload): Promise<void> {
    this.logger.warn(`Job failed: ${payload.executionId}`);
  }

  private async handleJobCancelled(payload: IJobEventPayload): Promise<void> {
    this.logger.log(`Job cancelled: ${payload.executionId}`);
  }

  private async handleJobPaused(payload: IJobEventPayload): Promise<void> {
    this.logger.log(`Job paused: ${payload.executionId}`);
  }

  private async handleJobResumed(payload: IJobEventPayload): Promise<void> {
    this.logger.log(`Job resumed: ${payload.executionId}`);
  }

  private async handleJobRetrying(payload: IJobEventPayload): Promise<void> {
    this.logger.log(`Job retrying: ${payload.executionId}`);
  }

  private async handleJobTimeout(payload: IJobEventPayload): Promise<void> {
    this.logger.warn(`Job timeout: ${payload.executionId}`);
  }

  private async handleJobArchived(payload: IJobEventPayload): Promise<void> {
    this.logger.log(`Job archived: ${payload.jobId}`);
  }
}
