import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PriceSyncRepository } from '../repository/price-sync.repository';
import { PriceSyncQueue } from '../queue/price-sync.queue';
import { SyncStatus } from '../interfaces';

@Injectable()
export class PriceSyncScheduler {
  private readonly logger = new Logger(PriceSyncScheduler.name);

  constructor(
    private readonly repository: PriceSyncRepository,
    private readonly queue: PriceSyncQueue,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledSyncs(): Promise<void> {
    this.logger.log('Checking for scheduled price syncs...');

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
      direction: schedule.direction,
      mode: schedule.mode,
      itemType: schedule.itemType,
      metadata: { scheduleId: schedule.id, trigger: 'SCHEDULED' },
    });

    await this.queue.enqueue({
      jobId: job.id,
      workspaceId: job.workspaceId,
      accountId: job.accountId,
      providerKey: job.providerKey,
      marketplaceKey: job.marketplaceKey,
      direction: job.direction,
      mode: job.mode,
      itemType: job.itemType,
      conflictStrategy: schedule.conflictStrategy,
    });

    this.logger.log(`Triggered scheduled sync: ${job.id} for schedule ${schedule.id}`);
  }
}
