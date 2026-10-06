import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IAnalyticsHealthEventPayload, AnalyticsHealthEventType } from '../interfaces';

@Processor('analytics-health-events')
export class AnalyticsHealthEventWorker extends WorkerHost {
  private readonly logger = new Logger(AnalyticsHealthEventWorker.name);

  async process(job: Job<IAnalyticsHealthEventPayload>): Promise<void> {
    const { event, workspaceId, service, status, incidentId, metadata } = job.data;

    this.logger.log(
      `Processing event: ${event} for workspace: ${workspaceId || 'system'}, service: ${service}`,
    );

    try {
      switch (event) {
        case AnalyticsHealthEventType.HEALTH_CHECK_COMPLETED:
          await this.handleHealthCheckCompleted(job.data);
          break;
        case AnalyticsHealthEventType.SERVICE_DEGRADED:
          await this.handleServiceDegraded(job.data);
          break;
        case AnalyticsHealthEventType.SERVICE_FAILED:
          await this.handleServiceFailed(job.data);
          break;
        case AnalyticsHealthEventType.SERVICE_RESTORED:
          await this.handleServiceRestored(job.data);
          break;
        case AnalyticsHealthEventType.INCIDENT_DETECTED:
          await this.handleIncidentDetected(job.data);
          break;
        case AnalyticsHealthEventType.INCIDENT_RESOLVED:
          await this.handleIncidentResolved(job.data);
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

  private async handleHealthCheckCompleted(payload: IAnalyticsHealthEventPayload): Promise<void> {
    this.logger.debug(
      `Health check completed: ${payload.service} (status: ${payload.status})`,
    );
  }

  private async handleServiceDegraded(payload: IAnalyticsHealthEventPayload): Promise<void> {
    this.logger.warn(
      `Service degraded: ${payload.service} in workspace: ${payload.workspaceId || 'system'}`,
      payload.metadata,
    );
  }

  private async handleServiceFailed(payload: IAnalyticsHealthEventPayload): Promise<void> {
    this.logger.error(
      `Service failed: ${payload.service} in workspace: ${payload.workspaceId || 'system'}`,
      payload.metadata,
    );
  }

  private async handleServiceRestored(payload: IAnalyticsHealthEventPayload): Promise<void> {
    this.logger.log(
      `Service restored: ${payload.service} in workspace: ${payload.workspaceId || 'system'}`,
    );
  }

  private async handleIncidentDetected(payload: IAnalyticsHealthEventPayload): Promise<void> {
    this.logger.warn(
      `Incident detected: ${payload.incidentId} for service: ${payload.service}`,
      payload.metadata,
    );
  }

  private async handleIncidentResolved(payload: IAnalyticsHealthEventPayload): Promise<void> {
    this.logger.log(`Incident resolved: ${payload.incidentId}`);
  }
}
