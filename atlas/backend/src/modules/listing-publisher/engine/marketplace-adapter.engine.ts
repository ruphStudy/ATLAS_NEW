import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import {
  MarketplacePublishResult,
  PublicationMarketplace,
} from '../interfaces';
import { AmazonAdapterFactory } from '../../marketplace-adapter/adapters/amazon/amazon-adapter.factory';
import { AdapterOperation, IRequestContext } from '../../marketplace-adapter/interfaces';

export interface MarketplacePublishContext {
  workspaceId: string;
  marketplaceAccountId?: string | null;
}

/**
 * Marketplace adapter registry. AMAZON dispatches to the real, per-request
 * AmazonAdapter (via AmazonAdapterFactory) — never mockPublish(). Every other
 * marketplace remains on the mock path until its own real adapter exists;
 * that mock output must never be presented as a real Amazon publish result.
 */
@Injectable()
export class MarketplaceAdapterEngine {
  private readonly logger = new Logger(MarketplaceAdapterEngine.name);

  constructor(private readonly amazonAdapterFactory: AmazonAdapterFactory) {}

  async publish(
    marketplace: PublicationMarketplace,
    listingContent: Record<string, unknown>,
    existingMarketplaceListingId?: string | null,
    context?: MarketplacePublishContext,
  ): Promise<MarketplacePublishResult> {
    this.logger.log(
      `Publishing to ${marketplace}${existingMarketplaceListingId ? ` (update ${existingMarketplaceListingId})` : ' (new)'}`,
    );

    if (marketplace === PublicationMarketplace.AMAZON) {
      return this.publishAmazon(listingContent, existingMarketplaceListingId, context);
    }

    // In production: dispatch to the correct adapter via a registry/strategy pattern.
    return this.mockPublish(marketplace, listingContent, existingMarketplaceListingId);
  }

  async unpublish(
    marketplace: PublicationMarketplace,
    marketplaceListingId: string,
  ): Promise<MarketplacePublishResult> {
    this.logger.log(`Unpublishing ${marketplaceListingId} from ${marketplace}`);
    // In production: call the marketplace delete/delist endpoint.
    return { success: true, marketplaceListingId };
  }

  async validate(
    marketplace: PublicationMarketplace,
    listingContent: Record<string, unknown>,
  ): Promise<{ valid: boolean; errors: string[] }> {
    // In production: call marketplace pre-validation APIs.
    const errors: string[] = [];
    if (!listingContent['title']) errors.push('Title is required');
    if (!listingContent['pricing'] && !listingContent['price']) errors.push('Pricing is required');
    if (marketplace === PublicationMarketplace.AMAZON && !listingContent['sku']) {
      errors.push('SKU is required');
    }
    return { valid: errors.length === 0, errors };
  }

  private async publishAmazon(
    listingContent: Record<string, unknown>,
    existingMarketplaceListingId: string | null | undefined,
    context?: MarketplacePublishContext,
  ): Promise<MarketplacePublishResult> {
    if (!context?.workspaceId || !context.marketplaceAccountId) {
      return {
        success: false,
        errorCode: 'AMAZON_ACCOUNT_REQUIRED',
        errorMessage:
          'A connected, active Amazon marketplace account is required to publish to Amazon',
      };
    }

    const sku = listingContent['sku'] as string | undefined;
    if (!sku) {
      return {
        success: false,
        errorCode: 'SKU_REQUIRED',
        errorMessage: 'A catalog SKU is required to publish to Amazon',
      };
    }

    const adapter = await this.amazonAdapterFactory.create(
      context.workspaceId,
      context.marketplaceAccountId,
    );

    try {
      const requestContext: IRequestContext = {
        workspaceId: context.workspaceId,
        provider: 'amazon',
        accountId: context.marketplaceAccountId,
        operation: existingMarketplaceListingId
          ? AdapterOperation.UPDATE_LISTING
          : AdapterOperation.CREATE_LISTING,
        requestId: randomUUID(),
      };

      const response = existingMarketplaceListingId
        ? await adapter.updateListing(requestContext, existingMarketplaceListingId, listingContent)
        : await adapter.createListing(requestContext, listingContent);

      if (!response.success) {
        return {
          success: false,
          errorCode: response.error?.code ?? 'AMAZON_PUBLISH_FAILED',
          errorMessage: response.error?.message ?? 'Amazon publish failed',
        };
      }

      return {
        success: true,
        marketplaceListingId: existingMarketplaceListingId ?? sku,
        marketplaceUrl: null,
        marketplaceResponse: response.data ?? null,
      };
    } finally {
      await this.amazonAdapterFactory.release(adapter);
    }
  }

  private mockPublish(
    marketplace: PublicationMarketplace,
    _content: Record<string, unknown>,
    existingId?: string | null,
  ): MarketplacePublishResult {
    const marketplaceListingId =
      existingId ?? `${marketplace.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const baseUrls: Record<PublicationMarketplace, string> = {
      [PublicationMarketplace.AMAZON]: 'https://www.amazon.com/dp',
      [PublicationMarketplace.EBAY]: 'https://www.ebay.com/itm',
      [PublicationMarketplace.SHOPIFY]: 'https://shop.example.com/products',
      [PublicationMarketplace.WALMART]: 'https://www.walmart.com/ip',
      [PublicationMarketplace.ETSY]: 'https://www.etsy.com/listing',
      [PublicationMarketplace.CUSTOM]: 'https://custom.marketplace.example.com/listing',
    };

    return {
      success: true,
      marketplaceListingId,
      marketplaceUrl: `${baseUrls[marketplace]}/${marketplaceListingId}`,
      marketplaceResponse: { status: 'ACTIVE', id: marketplaceListingId },
    };
  }
}
