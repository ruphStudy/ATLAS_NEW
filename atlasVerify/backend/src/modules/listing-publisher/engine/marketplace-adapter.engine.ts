import { Injectable, Logger } from '@nestjs/common';
import {
  MarketplacePublishResult,
  PublicationMarketplace,
} from '../interfaces';

/**
 * Marketplace adapter registry.
 * In production, inject real marketplace SDK clients and dispatch by marketplace.
 * Each adapter handles auth, rate-limiting, and idempotency with the remote API.
 */
@Injectable()
export class MarketplaceAdapterEngine {
  private readonly logger = new Logger(MarketplaceAdapterEngine.name);

  async publish(
    marketplace: PublicationMarketplace,
    listingContent: Record<string, unknown>,
    existingMarketplaceListingId?: string | null,
  ): Promise<MarketplacePublishResult> {
    this.logger.log(
      `Publishing to ${marketplace}${existingMarketplaceListingId ? ` (update ${existingMarketplaceListingId})` : ' (new)'}`,
    );

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
    if (!listingContent['pricing']) errors.push('Pricing is required');
    return { valid: errors.length === 0, errors };
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
