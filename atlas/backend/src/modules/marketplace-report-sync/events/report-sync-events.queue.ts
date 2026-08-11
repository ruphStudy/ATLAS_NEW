import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import { ReportSyncEvent } from '../interfaces';

export interface ReportSyncEventPayload {
  event: ReportSyncEvent;
  workspaceId: string;
  accountId: string;
  jobId?: string;
  externalReportId?: string;
  reportType?: string;
  data?: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class ReportSyncEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.MARKETPLACE_REPORT_SYNC_EVENTS)
    private readonly queue: Queue<ReportSyncEventPayload>,
  ) {}

  async publish(payload: Omit<ReportSyncEventPayload, 'timestamp'>): Promise<void> {
    await this.queue.add(payload.event, {
      ...payload,
      timestamp: new Date(),
    });
  }

  async publishBatch(payloads: Array<Omit<ReportSyncEventPayload, 'timestamp'>>): Promise<void> {
    const jobs = payloads.map((payload) => ({
      name: payload.event,
      data: {
        ...payload,
        timestamp: new Date(),
      },
    }));
    await this.queue.addBulk(jobs);
  }
}
