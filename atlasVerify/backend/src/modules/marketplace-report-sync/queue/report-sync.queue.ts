import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import { SyncMode, ReportType } from '../interfaces';

export interface ReportSyncJobPayload {
  jobId: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  reportType: ReportType;
  mode: SyncMode;
  startDate?: Date;
  endDate?: Date;
  cursor?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class ReportSyncQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.MARKETPLACE_REPORT_SYNC_JOBS)
    private readonly queue: Queue<ReportSyncJobPayload>,
  ) {}

  async enqueue(payload: ReportSyncJobPayload, delay?: number): Promise<void> {
    await this.queue.add('sync-report', payload, {
      jobId: payload.jobId,
      delay,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }

  async cancel(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }

  async getJob(jobId: string) {
    return this.queue.getJob(jobId);
  }
}
