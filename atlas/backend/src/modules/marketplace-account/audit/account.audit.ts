import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceAccountRepository } from '../repository/marketplace-account.repository';
import { IMarketplaceAccount, AccountStatus } from '../interfaces';

@Injectable()
export class AccountAudit {
  private readonly logger = new Logger(AccountAudit.name);

  constructor(private readonly repository: MarketplaceAccountRepository) {}

  async log(
    account: IMarketplaceAccount,
    event: string,
    opts?: {
      fromStatus?: AccountStatus | null;
      toStatus?: AccountStatus | null;
      reason?: string | null;
      changedBy?: string | null;
    },
  ): Promise<void> {
    try {
      // Omit credential/secret fields from snapshot
      const { credentialRef: _cr, ...safeAccount } = account as IMarketplaceAccount & { credentialRef?: unknown };
      await this.repository.createHistory({
        accountId: account.id,
        workspaceId: account.workspaceId,
        event,
        fromStatus: opts?.fromStatus ?? null,
        toStatus: opts?.toStatus ?? null,
        snapshot: safeAccount as unknown as Record<string, unknown>,
        reason: opts?.reason ?? null,
        changedBy: opts?.changedBy ?? null,
        createdAt: new Date(),
      });
    } catch (err) {
      this.logger.warn(`Failed to write account audit log for '${account.id}': ${(err as Error).message}`);
    }
  }
}
