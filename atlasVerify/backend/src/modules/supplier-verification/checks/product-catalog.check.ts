import { Injectable } from '@nestjs/common';
import { CHECK_NAMES } from '../../constants';
import type { ICheckResult, ISupplierForVerification, IVerificationCheck } from '../../interfaces';

@Injectable()
export class ProductCatalogCheck implements IVerificationCheck {
  readonly checkName = CHECK_NAMES.PRODUCT_CATALOG;
  readonly defaultWeight = 5;
  readonly defaultRequired = false;

  async execute(supplier: ISupplierForVerification): Promise<ICheckResult> {
    const categories = supplier.categories ?? [];
    const hasCategories = categories.length > 0;
    const rawData = supplier.rawData as Record<string, unknown>;
    const hasProductCount = typeof rawData['productCount'] === 'number' && (rawData['productCount'] as number) > 0;

    const passed = hasCategories || hasProductCount;
    const score = passed
      ? Math.min(100, (categories.length * 20) + (hasProductCount ? 40 : 0))
      : 0;

    return {
      passed,
      score,
      message: passed
        ? `Product catalog present: ${categories.length} categor${categories.length !== 1 ? 'ies' : 'y'}`
        : 'No product categories or catalog information found',
      details: {
        categoryCount: categories.length,
        categories,
        hasProductCount,
        productCount: rawData['productCount'] ?? null,
      },
    };
  }
}
