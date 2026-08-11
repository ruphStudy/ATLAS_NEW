import { Injectable } from '@nestjs/common';
import {
  ListingAdapterItem,
  ListingItemType,
  NormalizedListingItem,
  NormalizedVariant,
  NormalizedMedia,
  ListingStatus,
} from '../interfaces';

@Injectable()
export class ListingMapper {
  /**
   * Normalize an inbound marketplace listing record to ATLAS format.
   */
  normalizeInbound(
    adapterItem: ListingAdapterItem,
    providerKey: string,
    marketplaceKey: string,
  ): NormalizedListingItem {
    const d = adapterItem.data ?? {};

    return {
      externalId: adapterItem.externalId,
      externalSku: this.str(d, ['sku', 'seller_sku', 'merchant_sku', 'asin']),
      itemType: this.resolveItemType(d),
      title: this.str(d, ['title', 'product_name', 'name', 'item_name']),
      description: this.str(d, ['description', 'product_description', 'long_description']),
      bulletPoints: this.extractBullets(d),
      category: this.str(d, ['category', 'product_type', 'browse_node', 'category_id']),
      attributes: this.extractAttributes(d),
      variants: this.extractVariants(d),
      media: this.extractMedia(d),
      price: this.num(d, ['price', 'list_price', 'selling_price', 'amount']),
      currency: this.str(d, ['currency', 'currency_code']) ?? 'USD',
      status: this.resolveStatus(d),
      updatedAt: adapterItem.updatedAt ?? null,
      checksum: adapterItem.checksum ?? null,
      raw: this.sanitize(d),
    };
  }

  /**
   * Normalize outbound ATLAS listing for marketplace push.
   */
  normalizeOutbound(
    atlasData: Record<string, unknown>,
    externalId: string,
    providerKey: string,
    marketplaceKey: string,
  ): Record<string, unknown> {
    return {
      externalId,
      sku: atlasData['sku'],
      title: atlasData['title'],
      description: atlasData['description'],
      bulletPoints: atlasData['bulletPoints'] ?? [],
      category: atlasData['category'],
      attributes: atlasData['attributes'] ?? {},
      variants: atlasData['variants'] ?? [],
      media: atlasData['media'] ?? [],
      price: atlasData['price'],
      currency: atlasData['currency'] ?? 'USD',
      status: atlasData['status'],
      _providerKey: providerKey.toUpperCase(),
      _marketplaceKey: marketplaceKey.toUpperCase(),
    };
  }

  // ── Helpers ──────────────────────────────────────────────────

  private str(d: Record<string, unknown>, keys: string[]): string | null {
    for (const k of keys) {
      if (d[k] && typeof d[k] === 'string') return d[k] as string;
    }
    return null;
  }

  private num(d: Record<string, unknown>, keys: string[]): number | null {
    for (const k of keys) {
      if (d[k] !== undefined && d[k] !== null) {
        const n = Number(d[k]);
        if (!isNaN(n)) return n;
      }
    }
    return null;
  }

  private resolveItemType(d: Record<string, unknown>): ListingItemType {
    const t = String(d['itemType'] ?? d['item_type'] ?? d['type'] ?? '').toUpperCase();
    if (t === 'LISTING') return ListingItemType.LISTING;
    if (t === 'VARIANT') return ListingItemType.VARIANT;
    if (t === 'MEDIA') return ListingItemType.MEDIA;
    return ListingItemType.LISTING;
  }

  private resolveStatus(d: Record<string, unknown>): ListingStatus | null {
    const s = String(d['status'] ?? d['listing_status'] ?? '').toUpperCase();
    if (s === 'ACTIVE') return ListingStatus.ACTIVE;
    if (s === 'INACTIVE') return ListingStatus.INACTIVE;
    if (s === 'PAUSED') return ListingStatus.PAUSED;
    if (s === 'PENDING') return ListingStatus.PENDING;
    if (s === 'DRAFT') return ListingStatus.DRAFT;
    if (s === 'REJECTED') return ListingStatus.REJECTED;
    if (s === 'ARCHIVED') return ListingStatus.ARCHIVED;
    if (s === 'DELETED') return ListingStatus.DELETED;
    return null;
  }

  private extractBullets(d: Record<string, unknown>): string[] {
    const bullets = d['bulletPoints'] ?? d['bullet_points'] ?? d['features'] ?? [];
    if (Array.isArray(bullets)) {
      return bullets.filter((b) => typeof b === 'string').map((b) => String(b));
    }
    return [];
  }

  private extractAttributes(d: Record<string, unknown>): Record<string, unknown> {
    const attrs = d['attributes'] ?? d['product_attributes'] ?? {};
    if (typeof attrs === 'object' && attrs !== null && !Array.isArray(attrs)) {
      return attrs as Record<string, unknown>;
    }
    return {};
  }

  private extractVariants(d: Record<string, unknown>): NormalizedVariant[] {
    const variants = d['variants'] ?? d['variations'] ?? [];
    if (!Array.isArray(variants)) return [];
    return variants.map((v: any) => ({
      externalId: v.externalId ?? v.variant_id ?? v.id ?? '',
      sku: v.sku ?? v.variant_sku ?? null,
      attributes: v.attributes ?? {},
      price: this.num(v, ['price', 'variant_price']),
      media: this.extractMedia(v),
    }));
  }

  private extractMedia(d: Record<string, unknown>): NormalizedMedia[] {
    const media = d['media'] ?? d['images'] ?? d['image_urls'] ?? [];
    if (!Array.isArray(media)) return [];
    return media.map((m: any, idx: number) => {
      if (typeof m === 'string') {
        return { url: m, type: 'image', position: idx };
      }
      return {
        url: m.url ?? m.image_url ?? '',
        type: m.type ?? 'image',
        position: m.position ?? idx,
        altText: m.altText ?? m.alt_text ?? null,
      };
    });
  }

  private sanitize(d: Record<string, unknown>): Record<string, unknown> {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(d)) {
      if (k.match(/(secret|token|password|credential|key)/i)) continue;
      clean[k] = v;
    }
    return clean;
  }
}
