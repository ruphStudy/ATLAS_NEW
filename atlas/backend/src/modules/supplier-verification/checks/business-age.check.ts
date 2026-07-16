import { Injectable } from '@nestjs/common';
import { CHECK_NAMES } from '../../constants';
import type { ICheckResult, ISupplierForVerification, IVerificationCheck } from '../../interfaces';

const MIN_YEARS_FOR_PASS = 1;
const PREFERRED_YEARS = 3;

@Injectable()
export class BusinessAgeCheck implements IVerificationCheck {
  readonly checkName = CHECK_NAMES.BUSINESS_AGE;
  readonly defaultWeight = 10;
  readonly defaultRequired = false;

  async execute(supplier: ISupplierForVerification): Promise<ICheckResult> {
    const rawData = supplier.rawData as Record<string, unknown>;
    const establishedYear =
      typeof rawData['establishedYear'] === 'number'
        ? rawData['establishedYear']
        : typeof rawData['founded'] === 'number'
          ? rawData['founded']
          : null;

    if (establishedYear === null) {
      return {
        passed: false,
        score: 0,
        message: 'Business establishment year not available',
        details: { establishedYear: null, ageYears: null },
      };
    }

    const currentYear = new Date().getFullYear();
    const ageYears = currentYear - (establishedYear as number);
    const passed = ageYears >= MIN_YEARS_FOR_PASS;
    const score = Math.min(100, Math.round((ageYears / PREFERRED_YEARS) * 100));

    return {
      passed,
      score,
      message: passed
        ? `Business established in ${establishedYear} (${ageYears} year${ageYears !== 1 ? 's' : ''} old)`
        : `Business too new: ${ageYears} year(s) old (minimum ${MIN_YEARS_FOR_PASS} year required)`,
      details: { establishedYear, ageYears, minRequired: MIN_YEARS_FOR_PASS },
    };
  }
}
