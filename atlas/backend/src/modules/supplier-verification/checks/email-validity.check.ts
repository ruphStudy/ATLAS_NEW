import { Injectable } from '@nestjs/common';
import { CHECK_NAMES } from '../constants';
import type { ICheckResult, ISupplierForVerification, IVerificationCheck } from '../interfaces';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

@Injectable()
export class EmailValidityCheck implements IVerificationCheck {
  readonly checkName = CHECK_NAMES.EMAIL_VALIDITY;
  readonly defaultWeight = 10;
  readonly defaultRequired = false;

  async execute(supplier: ISupplierForVerification): Promise<ICheckResult> {
    if (!supplier.contactEmail) {
      return {
        passed: false,
        score: 0,
        message: 'No email address provided',
        details: { email: null },
      };
    }

    const isValid = EMAIL_REGEX.test(supplier.contactEmail.trim());
    const isBusinessEmail = !this.isFreeProvider(supplier.contactEmail);

    return {
      passed: isValid,
      score: isValid ? (isBusinessEmail ? 100 : 80) : 0,
      message: isValid
        ? isBusinessEmail
          ? `Business email verified: ${supplier.contactEmail}`
          : `Personal email detected: ${supplier.contactEmail}`
        : `Invalid email format: ${supplier.contactEmail}`,
      details: {
        email: supplier.contactEmail,
        isValid,
        isBusinessEmail,
      },
    };
  }

  private isFreeProvider(email: string): boolean {
    const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'rediffmail.com'];
    const domain = email.split('@')[1]?.toLowerCase() ?? '';
    return freeProviders.includes(domain);
  }
}
