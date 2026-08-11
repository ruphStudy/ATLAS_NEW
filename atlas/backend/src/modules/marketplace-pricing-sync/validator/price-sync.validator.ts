import { Injectable, BadRequestException } from '@nestjs/common';
import { NormalizedPriceItem, PriceItemType, SyncDirection, SyncMode } from '../interfaces';

@Injectable()
export class PriceSyncValidator {
  validateSyncRequest(params: {
    workspaceId: string;
    accountId: string;
    providerKey: string;
    marketplaceKey: string;
    direction: SyncDirection;
    mode: SyncMode;
    itemType: PriceItemType;
  }): void {
    if (!params.workspaceId?.trim()) {
      throw new BadRequestException('Workspace ID is required');
    }
    if (!params.accountId?.trim()) {
      throw new BadRequestException('Account ID is required');
    }
    if (!params.providerKey?.trim()) {
      throw new BadRequestException('Provider key is required');
    }
    if (!params.marketplaceKey?.trim()) {
      throw new BadRequestException('Marketplace key is required');
    }
    if (!Object.values(SyncDirection).includes(params.direction)) {
      throw new BadRequestException('Invalid sync direction');
    }
    if (!Object.values(SyncMode).includes(params.mode)) {
      throw new BadRequestException('Invalid sync mode');
    }
    if (!Object.values(PriceItemType).includes(params.itemType)) {
      throw new BadRequestException('Invalid item type');
    }
  }

  validatePriceItem(item: NormalizedPriceItem): void {
    if (!item.externalPriceId?.trim()) {
      throw new BadRequestException('External price ID is required');
    }
    if (!item.sku?.trim()) {
      throw new BadRequestException('SKU is required');
    }
    if (!item.currency?.trim()) {
      throw new BadRequestException('Currency is required');
    }

    if (item.currency.length !== 3) {
      throw new BadRequestException('Currency must be a 3-letter ISO code');
    }

    if (item.basePrice !== undefined && item.basePrice !== null) {
      this.validatePrice(item.basePrice, 'Base price');
    }
    if (item.salePrice !== undefined && item.salePrice !== null) {
      this.validatePrice(item.salePrice, 'Sale price');
    }
    if (item.listPrice !== undefined && item.listPrice !== null) {
      this.validatePrice(item.listPrice, 'List price');
    }

    if (item.salePrice && item.basePrice && item.salePrice > item.basePrice) {
      throw new BadRequestException('Sale price cannot be higher than base price');
    }

    if (item.effectiveFrom && item.effectiveTo) {
      if (new Date(item.effectiveFrom) >= new Date(item.effectiveTo)) {
        throw new BadRequestException('Effective from date must be before effective to date');
      }
    }

    if (item.minQuantity !== undefined && item.maxQuantity !== undefined) {
      if (item.minQuantity > item.maxQuantity) {
        throw new BadRequestException('Min quantity cannot be greater than max quantity');
      }
    }

    if (item.promotion) {
      this.validatePromotion(item.promotion);
    }

    if (item.tax) {
      this.validateTax(item.tax);
    }

    if (item.fees) {
      this.validateFees(item.fees);
    }
  }

  private validatePrice(price: number, label: string): void {
    if (typeof price !== 'number' || isNaN(price)) {
      throw new BadRequestException(`${label} must be a valid number`);
    }
    if (price < 0) {
      throw new BadRequestException(`${label} cannot be negative`);
    }
    if (price > 999999999) {
      throw new BadRequestException(`${label} exceeds maximum allowed value`);
    }
  }

  private validatePromotion(promotion: NormalizedPriceItem['promotion']): void {
    if (promotion.discountAmount !== undefined && promotion.discountAmount !== null) {
      this.validatePrice(promotion.discountAmount, 'Discount amount');
    }
    if (promotion.discountPercentage !== undefined && promotion.discountPercentage !== null) {
      if (promotion.discountPercentage < 0 || promotion.discountPercentage > 100) {
        throw new BadRequestException('Discount percentage must be between 0 and 100');
      }
    }
    if (promotion.startDate && promotion.endDate) {
      if (new Date(promotion.startDate) >= new Date(promotion.endDate)) {
        throw new BadRequestException('Promotion start date must be before end date');
      }
    }
  }

  private validateTax(tax: NormalizedPriceItem['tax']): void {
    if (tax.rate !== undefined && tax.rate !== null) {
      if (tax.rate < 0 || tax.rate > 100) {
        throw new BadRequestException('Tax rate must be between 0 and 100');
      }
    }
    if (tax.amount !== undefined && tax.amount !== null) {
      this.validatePrice(tax.amount, 'Tax amount');
    }
  }

  private validateFees(fees: NormalizedPriceItem['fees']): void {
    for (const fee of fees) {
      if (!fee.type?.trim()) {
        throw new BadRequestException('Fee type is required');
      }
      this.validatePrice(fee.amount, 'Fee amount');
      if (fee.percentage !== undefined && fee.percentage !== null) {
        if (fee.percentage < 0 || fee.percentage > 100) {
          throw new BadRequestException('Fee percentage must be between 0 and 100');
        }
      }
    }
  }

  validateScheduleExpression(cron: string): void {
    if (!cron?.trim()) {
      throw new BadRequestException('Cron expression is required');
    }
    const parts = cron.trim().split(/\s+/);
    if (parts.length < 5 || parts.length > 6) {
      throw new BadRequestException('Invalid cron expression format');
    }
  }
}
