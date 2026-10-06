import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { MarketplaceAccountService } from '../marketplace-account/marketplace-account.service';
import { AccountStatus } from '../marketplace-account/interfaces';
import { PublicationMarketplace } from './interfaces';

const AMAZON_PROVIDER_KEY = 'AMAZON';

/**
 * Implements the approved account-selection rule for real marketplace
 * publishing: an explicit account must belong to the workspace, match the
 * marketplace, and be ACTIVE; when omitted, the workspace's single active
 * account is used only if the choice is deterministic, otherwise this
 * throws asking the caller to pick one. Non-AMAZON marketplaces don't yet
 * require an account (still on the mock path) — passed through as-is.
 *
 * Shared by both the single-publish path (ListingPublisherService) and the
 * bulk-publish path (BulkPublishWorker) so the rule can't be bypassed by
 * going through bulk publish instead.
 */
@Injectable()
export class MarketplaceAccountResolver {
  constructor(private readonly marketplaceAccountService: MarketplaceAccountService) {}

  async resolve(
    workspaceId: string,
    marketplace: PublicationMarketplace,
    marketplaceAccountId?: string | null,
  ): Promise<string | null> {
    if (marketplace !== PublicationMarketplace.AMAZON) {
      return marketplaceAccountId ?? null;
    }

    if (marketplaceAccountId) {
      const account = await this.marketplaceAccountService.findById(marketplaceAccountId, workspaceId);
      if (account.providerKey !== AMAZON_PROVIDER_KEY) {
        throw new BadRequestException(`Account '${marketplaceAccountId}' is not an Amazon account`);
      }
      if (account.status !== AccountStatus.ACTIVE) {
        throw new ConflictException(
          `Amazon account '${marketplaceAccountId}' is not active (status: ${account.status})`,
        );
      }
      return account.id;
    }

    const { items } = await this.marketplaceAccountService.findAll({
      workspaceId,
      providerKey: AMAZON_PROVIDER_KEY,
      status: AccountStatus.ACTIVE,
      limit: 100,
    });

    if (items.length === 0) {
      throw new ConflictException(
        'No active Amazon account is connected for this workspace. Connect an Amazon seller account before publishing.',
      );
    }

    if (items.length === 1) {
      return items[0]!.id;
    }

    const defaults = items.filter((a) => a.isDefault);
    if (defaults.length === 1) {
      return defaults[0]!.id;
    }

    throw new ConflictException(
      'Multiple Amazon accounts are connected for this workspace with no unambiguous default. Specify marketplaceAccountId.',
    );
  }
}
