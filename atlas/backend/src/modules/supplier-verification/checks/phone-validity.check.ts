import { Injectable } from '@nestjs/common';
import { CHECK_NAMES } from '../constants';
import type { ICheckResult, ISupplierForVerification, IVerificationCheck } from '../interfaces';

// E.164 format: + followed by 7-15 digits
const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;

@Injectable()
export class PhoneValidityCheck implements IVerificationCheck {
  readonly checkName = CHECK_NAMES.PHONE_VALIDITY;
  readonly defaultWeight = 10;
  readonly defaultRequired = false;

  async execute(supplier: ISupplierForVerification): Promise<ICheckResult> {
    if (!supplier.contactPhone) {
      return {
        passed: false,
        score: 0,
        message: 'No phone number provided',
        details: { phone: null },
      };
    }

    const normalized = supplier.contactPhone.replace(/[\s\-().]/g, '');
    const isValid = PHONE_REGEX.test(normalized);

    return {
      passed: isValid,
      score: isValid ? 100 : 30,
      message: isValid
        ? `Phone number valid: ${supplier.contactPhone}`
        : `Phone number format invalid: ${supplier.contactPhone}`,
      details: { phone: supplier.contactPhone, normalized, isValid },
    };
  }
}
