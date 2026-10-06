import { Injectable } from '@nestjs/common';
import { CHECK_NAMES } from '../constants';
import type { ICheckResult, ISupplierForVerification, IVerificationCheck, IVerificationContext } from '../interfaces';

@Injectable()
export class BusinessRegistrationCheck implements IVerificationCheck {
  readonly checkName = CHECK_NAMES.BUSINESS_REGISTRATION;
  readonly defaultWeight = 20;
  readonly defaultRequired = true;

  async execute(supplier: ISupplierForVerification): Promise<ICheckResult> {
    const hasProviderId = supplier.providerSupplierId !== null && supplier.providerSupplierId !== '';
    const hasRegistrationInfo =
      typeof supplier.rawData['registrationNumber'] === 'string' ||
      typeof supplier.rawData['businessId'] === 'string' ||
      supplier.provider !== 'MANUAL';

    const passed = hasProviderId || hasRegistrationInfo;

    return {
      passed,
      score: passed ? 100 : 0,
      message: passed
        ? 'Business registration information verified'
        : 'No business registration information found',
      details: {
        hasProviderId,
        hasRegistrationInfo,
        provider: supplier.provider,
        providerSupplierId: supplier.providerSupplierId,
      },
    };
  }
}
