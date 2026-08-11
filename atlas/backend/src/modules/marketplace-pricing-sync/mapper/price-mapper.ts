import { Injectable } from '@nestjs/common';
import { NormalizedPriceItem } from '../interfaces';

@Injectable()
export class PriceMapper {
  normalizeInbound(rawPrice: any, providerKey: string, marketplaceKey: string): NormalizedPriceItem {
    return {
      externalPriceId: String(rawPrice.id || rawPrice.price_id || rawPrice.external_id),
      externalOfferId: rawPrice.offer_id ? String(rawPrice.offer_id) : undefined,
      sku: String(rawPrice.sku),
      variantId: rawPrice.variant_id ? String(rawPrice.variant_id) : undefined,
      marketplaceId: rawPrice.marketplace_id ? String(rawPrice.marketplace_id) : undefined,
      countryCode: rawPrice.country_code || rawPrice.country || undefined,
      currency: String(rawPrice.currency || rawPrice.currency_code || 'USD').toUpperCase(),
      basePrice: this.parsePrice(rawPrice.base_price || rawPrice.price || rawPrice.regular_price),
      salePrice: this.parsePrice(rawPrice.sale_price || rawPrice.promotional_price),
      listPrice: this.parsePrice(rawPrice.list_price || rawPrice.msrp),
      tax: rawPrice.tax
        ? {
            rate: this.parsePrice(rawPrice.tax.rate),
            amount: this.parsePrice(rawPrice.tax.amount),
            inclusive: Boolean(rawPrice.tax.inclusive),
          }
        : undefined,
      fees: rawPrice.fees
        ? rawPrice.fees.map((fee: any) => ({
            type: String(fee.type || fee.name),
            amount: this.parsePrice(fee.amount),
            percentage: fee.percentage !== undefined ? this.parsePrice(fee.percentage) : undefined,
          }))
        : undefined,
      promotion: rawPrice.promotion
        ? {
            id: rawPrice.promotion.id ? String(rawPrice.promotion.id) : undefined,
            type: rawPrice.promotion.type ? String(rawPrice.promotion.type) : undefined,
            discountAmount: this.parsePrice(rawPrice.promotion.discount_amount),
            discountPercentage: this.parsePrice(rawPrice.promotion.discount_percentage),
            startDate: rawPrice.promotion.start_date ? new Date(rawPrice.promotion.start_date) : undefined,
            endDate: rawPrice.promotion.end_date ? new Date(rawPrice.promotion.end_date) : undefined,
          }
        : undefined,
      effectiveFrom: rawPrice.effective_from ? new Date(rawPrice.effective_from) : undefined,
      effectiveTo: rawPrice.effective_to ? new Date(rawPrice.effective_to) : undefined,
      minQuantity: rawPrice.min_quantity !== undefined ? Number(rawPrice.min_quantity) : undefined,
      maxQuantity: rawPrice.max_quantity !== undefined ? Number(rawPrice.max_quantity) : undefined,
      isActive: rawPrice.is_active !== undefined ? Boolean(rawPrice.is_active) : true,
      isProtected: rawPrice.is_protected !== undefined ? Boolean(rawPrice.is_protected) : false,
      lastUpdatedAt: rawPrice.updated_at || rawPrice.last_updated_at
        ? new Date(rawPrice.updated_at || rawPrice.last_updated_at)
        : new Date(),
      rawData: rawPrice,
    };
  }

  normalizeOutbound(atlasPrice: any): Partial<NormalizedPriceItem> {
    return {
      sku: atlasPrice.sku,
      variantId: atlasPrice.variantId,
      currency: atlasPrice.currency,
      basePrice: atlasPrice.basePrice,
      salePrice: atlasPrice.salePrice,
      listPrice: atlasPrice.listPrice,
      tax: atlasPrice.tax,
      fees: atlasPrice.fees,
      promotion: atlasPrice.promotion,
      effectiveFrom: atlasPrice.effectiveFrom,
      effectiveTo: atlasPrice.effectiveTo,
      minQuantity: atlasPrice.minQuantity,
      maxQuantity: atlasPrice.maxQuantity,
      isActive: atlasPrice.isActive,
      isProtected: atlasPrice.isProtected,
      lastUpdatedAt: new Date(),
    };
  }

  private parsePrice(value: any): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }

  generateChecksum(price: NormalizedPriceItem): string {
    const crypto = require('crypto');
    const data = JSON.stringify({
      sku: price.sku,
      currency: price.currency,
      basePrice: price.basePrice,
      salePrice: price.salePrice,
      listPrice: price.listPrice,
      effectiveFrom: price.effectiveFrom,
      effectiveTo: price.effectiveTo,
      isActive: price.isActive,
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
