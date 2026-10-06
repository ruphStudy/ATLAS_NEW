import { Injectable } from '@nestjs/common';
import { MarketplaceAccountService } from '@modules/marketplace-account/marketplace-account.service';
import { MarketplaceProviderRegistry } from '@modules/marketplace-provider/registry/marketplace-provider.registry';
import { MultiBusinessService } from '@modules/multi-business/multi-business.service';
import { MultiBrandService } from '@modules/multi-brand/multi-brand.service';
import { ChannelProviderRegistry } from '../registry/channel-provider.registry';
import { ChannelType, IChannelValidationResult, ChannelValidationIssueType } from '../interfaces';

export interface ChannelCandidate {
  workspaceId: string;
  channelType: ChannelType;
  providerKey?: string | null;
  marketplaceAccountId?: string | null;
  businessId?: string | null;
  brandId?: string | null;
}

/**
 * MultiChannelValidator
 *
 * Validates a channel's cross-module references before register/update:
 * a MARKETPLACE-type channel's `marketplaceAccountId` must already exist
 * in the existing Multi-Marketplace Framework (`MarketplaceAccountService`)
 * — resolved by calling that module's own service, never re-implemented
 * here. Business/brand references are validated the same way against
 * Multi-Business/Multi-Brand Management. Provider-key registration is a
 * soft warning only (a channel is valid configuration even before its
 * adapter is registered). Duplicate-key and cross-channel mapping
 * conflicts are checked directly by `MultiChannelService`.
 */
@Injectable()
export class MultiChannelValidator {
  constructor(
    private readonly marketplaceAccountService: MarketplaceAccountService,
    private readonly marketplaceProviderRegistry: MarketplaceProviderRegistry,
    private readonly multiBusinessService: MultiBusinessService,
    private readonly multiBrandService: MultiBrandService,
    private readonly channelProviderRegistry: ChannelProviderRegistry,
  ) {}

  async validateChannel(candidate: ChannelCandidate): Promise<IChannelValidationResult> {
    const issues: IChannelValidationResult['issues'] = [];
    const warnings: string[] = [];

    if (candidate.channelType === ChannelType.MARKETPLACE) {
      if (candidate.marketplaceAccountId) {
        try {
          await this.marketplaceAccountService.findById(candidate.marketplaceAccountId, candidate.workspaceId);
        } catch {
          issues.push({
            type: ChannelValidationIssueType.UNKNOWN_MARKETPLACE_ACCOUNT,
            message: `Marketplace account '${candidate.marketplaceAccountId}' was not found in this workspace`,
          });
        }
      } else {
        warnings.push('A MARKETPLACE channel without a marketplaceAccountId cannot route any operations until one is set');
      }

      if (candidate.providerKey && !this.marketplaceProviderRegistry.isRegistered(candidate.providerKey)) {
        warnings.push(`Provider '${candidate.providerKey}' is not currently registered in the Multi-Marketplace Framework`);
      }
    } else if (candidate.providerKey && !this.channelProviderRegistry.isRegistered(candidate.providerKey)) {
      warnings.push(`Provider '${candidate.providerKey}' is not currently registered for channel type '${candidate.channelType}'`);
    }

    if (candidate.businessId) {
      try {
        await this.multiBusinessService.findBusinessById(candidate.businessId, candidate.workspaceId);
      } catch {
        issues.push({ type: ChannelValidationIssueType.UNKNOWN_BUSINESS, message: `Business '${candidate.businessId}' was not found in this workspace` });
      }
    }

    if (candidate.brandId) {
      try {
        await this.multiBrandService.findBrandById(candidate.brandId, candidate.workspaceId);
      } catch {
        issues.push({ type: ChannelValidationIssueType.UNKNOWN_BRAND, message: `Brand '${candidate.brandId}' was not found in this workspace` });
      }
    }

    return { valid: issues.length === 0, issues, warnings };
  }
}
