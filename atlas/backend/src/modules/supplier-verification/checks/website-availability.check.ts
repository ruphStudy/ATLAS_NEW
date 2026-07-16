import { Injectable } from '@nestjs/common';
import { CHECK_NAMES } from '../../constants';
import type { ICheckResult, ISupplierForVerification, IVerificationCheck } from '../../interfaces';

@Injectable()
export class WebsiteAvailabilityCheck implements IVerificationCheck {
  readonly checkName = CHECK_NAMES.WEBSITE_AVAILABILITY;
  readonly defaultWeight = 10;
  readonly defaultRequired = false;

  async execute(supplier: ISupplierForVerification): Promise<ICheckResult> {
    if (!supplier.website) {
      return {
        passed: false,
        score: 0,
        message: 'No website URL provided',
        details: { website: null, hasWebsite: false },
      };
    }

    // Stub: validates URL format. Production: HTTP HEAD request with timeout.
    const urlRegex = /^https?:\/\/.+\..+/i;
    const isValidFormat = urlRegex.test(supplier.website);

    return {
      passed: isValidFormat,
      score: isValidFormat ? 100 : 30,
      message: isValidFormat
        ? `Website URL present: ${supplier.website}`
        : `Invalid website URL format: ${supplier.website}`,
      details: {
        website: supplier.website,
        hasWebsite: true,
        isValidFormat,
        note: 'Production: HTTP ping validation',
      },
    };
  }
}
