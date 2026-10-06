import { Injectable } from '@nestjs/common';
import { CHECK_NAMES } from '../constants';
import type { ICheckResult, ISupplierForVerification, IVerificationCheck } from '../interfaces';

@Injectable()
export class ContactInfoCheck implements IVerificationCheck {
  readonly checkName = CHECK_NAMES.CONTACT_INFO;
  readonly defaultWeight = 15;
  readonly defaultRequired = true;

  async execute(supplier: ISupplierForVerification): Promise<ICheckResult> {
    const hasEmail = supplier.contactEmail !== null && supplier.contactEmail.trim() !== '';
    const hasPhone = supplier.contactPhone !== null && supplier.contactPhone.trim() !== '';
    const passed = hasEmail || hasPhone;

    return {
      passed,
      score: passed ? (hasEmail && hasPhone ? 100 : 70) : 0,
      message: passed
        ? `Contact info found (${[hasEmail && 'email', hasPhone && 'phone'].filter(Boolean).join(' + ')})`
        : 'No contact information found (email or phone required)',
      details: { hasEmail, hasPhone },
    };
  }
}
