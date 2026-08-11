import { Injectable, Logger } from '@nestjs/common';
import { PricePuller } from '../puller/price-puller';
import { PricePusher } from '../pusher/price-pusher';
import { PriceSyncAdapter, SyncDirection } from '../interfaces';

@Injectable()
export class PriceSyncRunner {
  private readonly logger = new Logger(PriceSyncRunner.name);

  constructor(
    private readonly puller: PricePuller,
    private readonly pusher: PricePusher,
  ) {}

  async execute(params: {
    jobId: string;
    workspaceId: string;
    accountId: string;
    adapter: PriceSyncAdapter;
    direction: SyncDirection;
    itemType: any;
    conflictStrategy: any;
    cursor?: string;
    batchSize?: number;
  }): Promise<void> {
    const { direction } = params;

    if (direction === SyncDirection.INBOUND || direction === SyncDirection.BIDIRECTIONAL) {
      await this.puller.run(params);
    }

    if (direction === SyncDirection.OUTBOUND || direction === SyncDirection.BIDIRECTIONAL) {
      const prices = await this.getAtlasPrices(params.workspaceId, params.accountId);
      await this.pusher.push({
        jobId: params.jobId,
        workspaceId: params.workspaceId,
        accountId: params.accountId,
        adapter: params.adapter,
        prices,
      });
    }
  }

  private async getAtlasPrices(workspaceId: string, accountId: string): Promise<any[]> {
    return [];
  }
}
