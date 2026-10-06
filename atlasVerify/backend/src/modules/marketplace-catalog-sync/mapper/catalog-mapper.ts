import { Injectable } from '@nestjs/common';
import {
  NormalizedCatalogItem,
  SyncAdapterItem,
  SyncItemType,
} from '../interfaces';

/**
 * CatalogMapper
 *
 * Transforms marketplace adapter responses into a normalized ATLAS format
 * and ATLAS catalog data into marketplace-ready payloads.
 *
 * In production this would delegate to MarketplaceListingMappingService
 * for provider-specific schema transformations.
 */
@Injectable()
export class CatalogMapper {
  /**
   * Normalize an inbound item from the marketplace adapter into ATLAS format.
   */
  normalizeInbound(
    adapterItem: SyncAdapterItem,
    providerKey: string,
    marketplaceKey: string,
  ): NormalizedCatalogItem {
    const data = adapterItem.data ?? {};

    return {
      externalId: adapterItem.externalId,
      externalSku: this.extractString(data, ['sku', 'seller_sku', 'merchant_sku', 'item_sku']),
      itemType: adapterItem.itemType,
      title: this.extractString(data, ['title', 'name', 'item_name', 'product_name']),
      description: this.extractString(data, ['description', 'body_html', 'product_description']),
      categories: this.extractCategories(data),
      attributes: this.extractAttributes(data),
      variants: this.extractVariants(data),
      images: this.extractImages(data),
      price: this.extractNumber(data, ['price', 'sale_price', 'listing_price', 'amount']),
      currency: this.extractString(data, ['currency', 'currency_code']),
      inventory: this.extractNumber(data, ['quantity', 'inventory_quantity', 'stock']),
      listingStatus: this.extractString(data, ['status', 'listing_status', 'state']),
      updatedAt: adapterItem.updatedAt ?? null,
      checksum: adapterItem.checksum ?? null,
      raw: this.sanitizeRaw(data),
    };
  }

  /**
   * Transform ATLAS catalog data into marketplace-compatible payload.
   */
  normalizeOutbound(
    atlasData: Record<string, unknown>,
    providerKey: string,
    marketplaceKey: string,
  ): Record<string, unknown> {
    // Base normalized representation; provider-specific engines would extend this
    const result: Record<string, unknown> = {};

    if (atlasData['title']) result['title'] = atlasData['title'];
    if (atlasData['description']) result['description'] = atlasData['description'];
    if (atlasData['sku']) result['sku'] = atlasData['sku'];
    if (atlasData['price']) result['price'] = atlasData['price'];
    if (atlasData['currency']) result['currency'] = atlasData['currency'];
    if (atlasData['inventory'] !== undefined) result['quantity'] = atlasData['inventory'];
    if (atlasData['categories']) result['categories'] = atlasData['categories'];
    if (atlasData['images']) result['images'] = atlasData['images'];
    if (atlasData['attributes']) result['attributes'] = atlasData['attributes'];
    if (atlasData['variants']) result['variants'] = atlasData['variants'];

    // Provider / marketplace metadata
    result['_providerKey'] = providerKey.toUpperCase();
    result['_marketplaceKey'] = marketplaceKey.toUpperCase();

    return result;
  }

  // ── Helpers ───────────────────────────────────────────────

  private extractString(
    data: Record<string, unknown>,
    keys: string[],
  ): string | null {
    for (const key of keys) {
      if (data[key] && typeof data[key] === 'string') return data[key] as string;
    }
    return null;
  }

  private extractNumber(
    data: Record<string, unknown>,
    keys: string[],
  ): number | null {
    for (const key of keys) {
      const val = data[key];
      if (val !== undefined && val !== null) {
        const n = Number(val);
        if (!isNaN(n)) return n;
      }
    }
    return null;
  }

  private extractCategories(data: Record<string, unknown>): string[] {
    const cats = data['categories'] ?? data['category'] ?? data['browse_nodes'] ?? data['product_type'];
    if (Array.isArray(cats)) return cats.map(String);
    if (typeof cats === 'string') return [cats];
    return [];
  }

  private extractAttributes(data: Record<string, unknown>): Record<string, unknown> {
    const attrs = data['attributes'] ?? data['item_attributes'] ?? data['product_attributes'];
    if (attrs && typeof attrs === 'object' && !Array.isArray(attrs)) {
      return attrs as Record<string, unknown>;
    }
    return {};
  }

  private extractVariants(data: Record<string, unknown>) {
    const variants = data['variants'] ?? data['child_asins'] ?? data['variations'] ?? [];
    if (!Array.isArray(variants)) return [];
    return variants.map((v) => {
      const variant = v as Record<string, unknown>;
      return {
        externalId: String(variant['id'] ?? variant['asin'] ?? variant['variantId'] ?? ''),
        sku: this.extractString(variant, ['sku', 'seller_sku']),
        attributes: this.extractAttributes(variant),
        price: this.extractNumber(variant, ['price', 'amount']),
        inventory: this.extractNumber(variant, ['quantity', 'stock']),
      };
    });
  }

  private extractImages(data: Record<string, unknown>) {
    const imgs = data['images'] ?? data['image_urls'] ?? [];
    if (!Array.isArray(imgs)) return [];
    return imgs.map((img, idx) => {
      if (typeof img === 'string') return { url: img, position: idx };
      const obj = img as Record<string, unknown>;
      return {
        url: String(obj['url'] ?? obj['src'] ?? ''),
        position: typeof obj['position'] === 'number' ? obj['position'] : idx,
        altText: obj['altText'] ? String(obj['altText']) : null,
      };
    });
  }

  private sanitizeRaw(data: Record<string, unknown>): Record<string, unknown> {
    const unsafe = /secret|token|password|credential|key|auth/i;
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, unsafe.test(k) ? '***' : v]),
    );
  }
}
