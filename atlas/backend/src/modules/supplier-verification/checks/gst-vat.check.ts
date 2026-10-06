import { Injectable } from '@nestjs/common';
import { CHECK_NAMES } from '../constants';
import type { ICheckResult, ISupplierForVerification, IVerificationCheck } from '../interfaces';

@Injectable()
export class GstVatCheck implements IVerificationCheck {
  readonly checkName = CHECK_NAMES.GST_VAT;
  readonly defaultWeight = 15;
  readonly defaultRequired = false;

  async execute(supplier: ISupplierForVerification): Promise<ICheckResult> {
    // GST is primarily applicable for Indian suppliers
    const requiresGst = supplier.country === 'IN';
    const requiresVat = ['DE', 'FR', 'UK', 'GB', 'EU'].includes(supplier.country.toUpperCase());

    if (!requiresGst && !requiresVat) {
      return {
        passed: true,
        score: 100,
        message: `GST/VAT check not applicable for ${supplier.country}`,
        details: { applicable: false, country: supplier.country },
      };
    }

    const rawData = supplier.rawData as Record<string, unknown>;
    const hasGst = typeof rawData['gstNumber'] === 'string' || typeof rawData['gstin'] === 'string';
    const hasVat = typeof rawData['vatNumber'] === 'string' || typeof rawData['vatId'] === 'string';
    const passed = (requiresGst && hasGst) || (requiresVat && hasVat) || (!requiresGst && !requiresVat);

    return {
      passed,
      score: passed ? 100 : 0,
      message: passed
        ? `${requiresGst ? 'GST' : 'VAT'} number verified`
        : `${requiresGst ? 'GST' : 'VAT'} number not found`,
      details: { requiresGst, requiresVat, hasGst, hasVat, country: supplier.country },
    };
  }
}
