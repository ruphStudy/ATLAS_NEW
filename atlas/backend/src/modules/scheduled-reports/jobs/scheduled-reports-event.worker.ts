import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IScheduledReportEventPayload, ScheduledReportEvent } from '../interfaces';

@Processor('scheduled-reports-events')
export class ScheduledReportsEventWorker extends WorkerHost {
  private readonly logger = new Logger(ScheduledReportsEventWorker.name);

  async process(job: Job<IScheduledReportEventPayload>): Promise<void> {
    const { event, workspaceId, scheduleId, scheduleKey, executionId, metadata } = job.data;

    this.logger.log(
      `Processing event: ${event} for workspace: ${workspaceId}, schedule: ${scheduleId || scheduleKey}, execution: ${executionId}`,
    );

    try {
      switch (event) {
        case ScheduledReportEvent.SCHEDULE_CREATED:
          await this.handleScheduleCreated(job.data);
          break;
        case ScheduledReportEvent.SCHEDULE_UPDATED:
          await this.handleScheduleUpdated(job.data);
          break;
        case ScheduledReportEvent.SCHEDULE_ENABLED:
          await this.handleScheduleEnabled(job.data);
          break;
        case ScheduledReportEvent.SCHEDULE_DISABLED:
          await this.handleScheduleDisabled(job.data);
          break;
        case ScheduledReportEvent.SCHEDULE_PAUSED:
          await this.handleSchedulePaused(job.data);
          break;
        case ScheduledReportEvent.SCHEDULE_RESUMED:
          await this.handleScheduleResumed(job.data);
          break;
        case ScheduledReportEvent.SCHEDULE_DELETED:
          await this.handleScheduleDeleted(job.data);
          break;
        case ScheduledReportEvent.EXECUTION_SCHEDULED:
          await this.handleExecutionScheduled(job.data);
          break;
        case ScheduledReportEvent.EXECUTION_STARTED:
          await this.handleExecutionStarted(job.data);
          break;
        case ScheduledReportEvent.GENERATION_STARTED:
          await this.handleGenerationStarted(job.data);
          break;
        case ScheduledReportEvent.GENERATION_COMPLETED:
          await this.handleGenerationCompleted(job.data);
          break;
        case ScheduledReportEvent.GENERATION_FAILED:
          await this.handleGenerationFailed(job.data);
          break;
        case ScheduledReportEvent.DELIVERY_STARTED:
          await this.handleDeliveryStarted(job.data);
          break;
        case ScheduledReportEvent.DELIVERY_COMPLETED:
          await this.handleDeliveryCompleted(job.data);
          break;
        case ScheduledReportEvent.DELIVERY_FAILED:
          await this.handleDeliveryFailed(job.data);
          break;
        case ScheduledReportEvent.EXECUTION_COMPLETED:
          await this.handleExecutionCompleted(job.data);
          break;
        case ScheduledReportEvent.EXECUTION_FAILED:
          await this.handleExecutionFailed(job.data);
          break;
        case ScheduledReportEvent.EXECUTION_RETRYING:
          await this.handleExecutionRetrying(job.data);
          break;
        case ScheduledReportEvent.MISSED_RUN_DETECTED:
          await this.handleMissedRunDetected(job.data);
          break;
        case ScheduledReportEvent.MISSED_RUN_RECOVERED:
          await this.handleMissedRunRecovered(job.data);
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

  private async handleScheduleCreated(payload: IScheduledReportEventPayload): Promise<void> {
    this.logger.debug(`Schedule created: ${payload.scheduleId}`);
  }

  private async handleScheduleUpdated(payload: IScheduledReportEventPayload): Promise<void> {
    this.logger.debug(`Schedule updated: ${payload.scheduleId}`);
  }

  private async handleScheduleEnabled(payload: IScheduledReportEventPayload): Promise<void> {
    this.logger.debug(`Schedule enabled: ${payload.scheduleId}`);
  }

  private async handleScheduleDisabled(payload: IScheduledReportEventPayload): Promise<void> {
    this.logger.debug(`Schedule disabled: ${payload.scheduleId}`);
  }

  private async handleSchedulePaused(payload: IScheduledReportEventPayload): Promise<void> {
    this.logger.debug(`Schedule paused: ${payload.scheduleId}`);
  }

  private async handleScheduleResumed(payload: IScheduledReportEventPayload): Promise<void> {
    this.logger.debug(`Schedule resumed: ${payload.scheduleId}`);
  }

  private async handleScheduleDeleted(payload: IScheduledReportEventPayload): Promise<void> {
    this.logger.debug(`Schedule deleted: ${payload.scheduleId}`);
  }

  private async handleExecutionScheduled(payload: IScheduledReportEventPayload): Promise<void> {
    this.logger.debug(`Execution scheduled: ${payload.executionId}`);
  }

  private async handleExecutionStarted(payload: IScheduledReportEventPayload): Promise<void> {
    this.logger.debug(`Execution started: ${payload.executionId}`);
  }

  private async handleGenerationStarted(payload: IScheduledReportEventPayload): Promise<void> {
    this.logger.debug(`Report generation started: ${payload.executionId}`);
  }

  private async handleGenerationCompleted(payload: IScheduledReportEventPayload): Promise<void> {
    this.logger.debug(`Report generation completed: ${payload.executionId}`);
  }

  private async handleGenerationFailed(payload: IScheduledReportEventPayload): Promise<void> {
    this.logger.warn(`Report generation failed: ${payload.executionId}`);
  }

  private async handleDeliveryStarted(payload: IScheduledReportEventPayload): Promise<void> {
    this.logger.debug(`Report delivery started: ${payload.executionId}`);
  }

  private async handleDeliveryCompleted(payload: IScheduledReportEventPayload): Promise<void> {
    this.logger.debug(`Report delivery completed: ${payload.executionId}`);
  }

  private async handleDeliveryFailed(payload: IScheduledReportEventPayload): Promise<void> {
    this.logger.warn(`Report delivery failed: ${payload.executionId}`);
  }

  private async handleExecutionCompleted(payload: IScheduledReportEventPayload): Promise<void> {
    this.logger.log(`Execution completed successfully: ${payload.executionId}`);
  }

  private async handleExecutionFailed(payload: IScheduledReportEventPayload): Promise<void> {
    this.logger.error(`Execution failed: ${payload.executionId}`);
  }

  private async handleExecutionRetrying(payload: IScheduledReportEventPayload): Promise<void> {
    this.logger.warn(`Execution retrying: ${payload.executionId}`);
  }

  private async handleMissedRunDetected(payload: IScheduledReportEventPayload): Promise<void> {
    this.logger.warn(`Missed run detected for schedule: ${payload.scheduleId}`);
  }

  private async handleMissedRunRecovered(payload: IScheduledReportEventPayload): Promise<void> {
    this.logger.log(`Missed run recovered for schedule: ${payload.scheduleId}`);
  }
}
