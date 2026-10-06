import { Injectable } from '@nestjs/common';
import { CHECK_NAMES } from '../constants';
import type { ICheckResult, ISupplierForVerification, IVerificationCheck } from '../interfaces';

const REQUIRED_FIELDS: Array<keyof ISupplierForVerification> = [
  'name', 'country', 'contactEmail', 'contactPhone', 'website', 'city',
];

const OPTIONAL_FIELDS: Array<keyof ISupplierForVerification> = [
  'minOrderQuantity', 'avgLeadTimeDays', 'overallRating',
];

const PASS_THRESHOLD = 50; // minimum completeness % to pass

@Injectable()
export class ProfileCompletenessCheck implements IVerificationCheck {
  readonly checkName = CHECK_NAMES.PROFILE_COMPLETENESS;
  readonly defaultWeight = 5;
  readonly defaultRequired = false;

  async execute(supplier: ISupplierForVerification): Promise<ICheckResult> {
    const requiredFilled = REQUIRED_FIELDS.filter(
      (f) => supplier[f] !== null && supplier[f] !== undefined && supplier[f] !== '',
    ).length;

    const optionalFilled = OPTIONAL_FIELDS.filter(
      (f) => supplier[f] !== null && supplier[f] !== undefined,
    ).length;

    const totalPossible = REQUIRED_FIELDS.length + OPTIONAL_FIELDS.length;
    const totalFilled = requiredFilled + optionalFilled;
    const completeness = Math.round((totalFilled / totalPossible) * 100);
    const passed = completeness >= PASS_THRESHOLD;

    return {
      passed,
      score: completeness,
      message: `Profile ${completeness}% complete (${totalFilled}/${totalPossible} fields)`,
      details: {
        completeness,
        requiredFilled,
        requiredTotal: REQUIRED_FIELDS.length,
        optionalFilled,
        optionalTotal: OPTIONAL_FIELDS.length,
        passThreshold: PASS_THRESHOLD,
      },
    };
  }
}
