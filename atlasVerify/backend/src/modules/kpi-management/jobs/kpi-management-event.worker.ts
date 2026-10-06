import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IKpiEvent, KpiEventType } from '../interfaces';

@Processor('kpi-management-events')
export class KpiManagementEventWorker extends WorkerHost {
  private readonly logger = new Logger(KpiManagementEventWorker.name);

  async process(job: Job<IKpiEvent>): Promise<void> {
    const event = job.data;

    this.logger.debug(
      `Processing event: ${event.event} for workspace ${event.workspaceId}`,
    );

    try {
      switch (event.event) {
        case KpiEventType.KPI_CREATED:
          await this.handleKpiCreated(event);
          break;

        case KpiEventType.KPI_UPDATED:
          await this.handleKpiUpdated(event);
          break;

        case KpiEventType.KPI_ENABLED:
          await this.handleKpiEnabled(event);
          break;

        case KpiEventType.KPI_DISABLED:
          await this.handleKpiDisabled(event);
          break;

        case KpiEventType.KPI_ARCHIVED:
          await this.handleKpiArchived(event);
          break;

        case KpiEventType.KPI_CALCULATED:
          await this.handleKpiCalculated(event);
          break;

        case KpiEventType.THRESHOLD_EXCEEDED:
          await this.handleThresholdExceeded(event);
          break;

        case KpiEventType.TARGET_ACHIEVED:
          await this.handleTargetAchieved(event);
          break;

        case KpiEventType.TARGET_MISSED:
          await this.handleTargetMissed(event);
          break;

        case KpiEventType.SNAPSHOT_CREATED:
          await this.handleSnapshotCreated(event);
          break;

        case KpiEventType.VERSION_CREATED:
          await this.handleVersionCreated(event);
          break;

        default:
          this.logger.warn(`Unhandled event type: ${event.event}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing event ${event.event}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  private async handleKpiCreated(event: IKpiEvent): Promise<void> {
    this.logger.log(`KPI created: ${event.kpiKey} for workspace ${event.workspaceId}`);
  }

  private async handleKpiUpdated(event: IKpiEvent): Promise<void> {
    this.logger.log(`KPI updated: ${event.kpiKey} for workspace ${event.workspaceId}`);
  }

  private async handleKpiEnabled(event: IKpiEvent): Promise<void> {
    this.logger.log(`KPI enabled: ${event.kpiKey} for workspace ${event.workspaceId}`);
  }

  private async handleKpiDisabled(event: IKpiEvent): Promise<void> {
    this.logger.log(`KPI disabled: ${event.kpiKey} for workspace ${event.workspaceId}`);
  }

  private async handleKpiArchived(event: IKpiEvent): Promise<void> {
    this.logger.log(`KPI archived: ${event.kpiKey} for workspace ${event.workspaceId}`);
  }

  private async handleKpiCalculated(event: IKpiEvent): Promise<void> {
    this.logger.log(`KPI calculated: ${event.kpiKey} for workspace ${event.workspaceId}`);
  }

  private async handleThresholdExceeded(event: IKpiEvent): Promise<void> {
    this.logger.log(`Threshold exceeded: ${event.kpiKey} for workspace ${event.workspaceId}`);
  }

  private async handleTargetAchieved(event: IKpiEvent): Promise<void> {
    this.logger.log(`Target achieved: ${event.kpiKey} for workspace ${event.workspaceId}`);
  }

  private async handleTargetMissed(event: IKpiEvent): Promise<void> {
    this.logger.log(`Target missed: ${event.kpiKey} for workspace ${event.workspaceId}`);
  }

  private async handleSnapshotCreated(event: IKpiEvent): Promise<void> {
    this.logger.log(`Snapshot created for KPI: ${event.kpiKey} in workspace ${event.workspaceId}`);
  }

  private async handleVersionCreated(event: IKpiEvent): Promise<void> {
    this.logger.log(`Version created for KPI: ${event.kpiKey} in workspace ${event.workspaceId}`);
  }
}
