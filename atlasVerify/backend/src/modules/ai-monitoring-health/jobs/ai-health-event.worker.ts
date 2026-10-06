import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AiHealthEvent, AiHealthEventType } from '../interfaces';

@Processor('ai-health-events')
export class AiHealthEventWorker extends WorkerHost {
  private readonly logger = new Logger(AiHealthEventWorker.name);

  async process(job: Job<AiHealthEvent>): Promise<void> {
    const { event } = job.data;

    this.logger.debug(`Processing ${event} event`, {
      jobId: job.id,
      workspaceId: job.data.workspaceId,
    });

    try {
      switch (event) {
        case AiHealthEventType.HEALTH_CHECK:
          await this.handleHealthCheck(job.data);
          break;
        case AiHealthEventType.DEGRADATION:
          await this.handleDegradation(job.data);
          break;
        case AiHealthEventType.OUTAGE:
          await this.handleOutage(job.data);
          break;
        case AiHealthEventType.RECOVERY:
          await this.handleRecovery(job.data);
          break;
        case AiHealthEventType.THRESHOLD_EXCEEDED:
          await this.handleThresholdExceeded(job.data);
          break;
        case AiHealthEventType.INCIDENT_CREATED:
          await this.handleIncidentCreated(job.data);
          break;
        case AiHealthEventType.INCIDENT_RESOLVED:
          await this.handleIncidentResolved(job.data);
          break;
        default:
          this.logger.warn(`Unknown event type: ${event}`);
      }

      this.logger.debug(`Successfully processed ${event} event`);
    } catch (error) {
      this.logger.error(`Failed to process ${event} event`, error);
      throw error;
    }
  }

  private async handleHealthCheck(event: AiHealthEvent): Promise<void> {
    this.logger.debug('Health check event processed', {
      workspaceId: event.workspaceId,
    });
  }

  private async handleDegradation(event: AiHealthEvent): Promise<void> {
    this.logger.warn('Health degradation detected', {
      workspaceId: event.workspaceId,
    });
  }

  private async handleOutage(event: AiHealthEvent): Promise<void> {
    this.logger.error('Health outage detected', {
      workspaceId: event.workspaceId,
    });
  }

  private async handleRecovery(event: AiHealthEvent): Promise<void> {
    this.logger.log('Health recovery detected', {
      workspaceId: event.workspaceId,
    });
  }

  private async handleThresholdExceeded(event: AiHealthEvent): Promise<void> {
    this.logger.warn('Health threshold exceeded', {
      workspaceId: event.workspaceId,
    });
  }

  private async handleIncidentCreated(event: AiHealthEvent): Promise<void> {
    this.logger.warn('Health incident created', {
      workspaceId: event.workspaceId,
    });
  }

  private async handleIncidentResolved(event: AiHealthEvent): Promise<void> {
    this.logger.log('Health incident resolved', {
      workspaceId: event.workspaceId,
    });
  }
}
