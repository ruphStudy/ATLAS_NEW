import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReportSyncRepository } from '../repository/report-sync.repository';
import { ReportSyncQueue } from '../queue/report-sync.queue';

@Injectable()
export class ReportSyncScheduler {
  private readonly logger = new Logger(ReportSyncScheduler.name);

  constructor(
    private readonly repository: ReportSyncRepository,
    private readonly queue: ReportSyncQueue,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledSyncs(): Promise<void> {
    this.logger.log('Checking for scheduled report syncs...');

    const schedules = await this.getAllActiveSchedules();

    for (const schedule of schedules) {
      try {
        if (await this.shouldRun(schedule)) {
          await this.triggerSync(schedule);
        }
      } catch (error) {
        this.logger.error(`Failed to process schedule ${schedule.id}: ${(error as Error).message}`);
      }
    }
  }

  private async getAllActiveSchedules(): Promise<any[]> {
    return [];
  }

  private async shouldRun(schedule: any): Promise<boolean> {
    return true;
  }

  private async triggerSync(schedule: any): Promise<void> {
    const job = await this.repository.createJob({
      workspaceId: schedule.workspaceId,
      accountId: schedule.accountId,
      providerKey: schedule.providerKey,
      marketplaceKey: schedule.marketplaceKey,
      reportType: schedule.reportType,
      mode: schedule.mode,
      metadata: { scheduleId: schedule.id, trigger: 'SCHEDULED' },
    });

    await this.queue.enqueue({
      jobId: job.id,
      workspaceId: job.workspaceId,
      accountId: job.accountId,
      providerKey: job.providerKey,
      marketplaceKey: job.marketplaceKey,
      reportType: job.reportType,
      mode: job.mode,
    });

    this.logger.log(`Triggered scheduled sync: ${job.id} for schedule ${schedule.id}`);
  }
}
