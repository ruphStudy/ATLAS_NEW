import { Injectable, Logger } from '@nestjs/common';
import { ReportPuller } from '../puller/report-puller';

@Injectable()
export class ReportSyncRunner {
  private readonly logger = new Logger(ReportSyncRunner.name);

  constructor(private readonly puller: ReportPuller) {}

  async execute(params: {
    jobId: string;
    workspaceId: string;
    accountId: string;
    adapter: any;
    reportType: any;
    startDate?: Date;
    endDate?: Date;
    cursor?: string;
    batchSize?: number;
    pollInterval?: number;
    maxPollAttempts?: number;
  }): Promise<void> {
    await this.puller.run(params);
  }
}
