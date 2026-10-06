import { IPlanEntitlement, IPlanLimit, IPlanPrice } from './interfaces';

export interface IPlanValidationIssue {
  severity: 'ERROR' | 'WARNING';
  message: string;
}

/**
 * Pure structural validation — never business rules about what a plan
 * SHOULD contain (that's each consuming module's own concern). Only
 * checks the shape is internally consistent enough to be safely consumed
 * by Subscription/Usage/Quota/Billing/License/Feature-Flag modules.
 */
export function validatePlanEntitlements(entitlements: IPlanEntitlement[]): IPlanValidationIssue[] {
  const issues: IPlanValidationIssue[] = [];
  const seen = new Set<string>();

  for (const entitlement of entitlements) {
    if (!entitlement.module || !entitlement.feature) {
      issues.push({ severity: 'ERROR', message: 'Every entitlement requires module and feature' });
      continue;
    }
    if (typeof entitlement.included !== 'boolean') {
      issues.push({ severity: 'ERROR', message: `Entitlement '${entitlement.module}.${entitlement.feature}' requires a boolean 'included'` });
    }
    const key = `${entitlement.module}.${entitlement.feature}.${entitlement.capability ?? ''}.${entitlement.resource ?? ''}`;
    if (seen.has(key)) {
      issues.push({ severity: 'WARNING', message: `Duplicate entitlement declaration for '${key}'` });
    }
    seen.add(key);
  }

  return issues;
}

export function validatePlanLimits(limits: IPlanLimit[]): IPlanValidationIssue[] {
  const issues: IPlanValidationIssue[] = [];
  const seen = new Set<string>();

  for (const limit of limits) {
    if (!limit.resourceKey) {
      issues.push({ severity: 'ERROR', message: 'Every limit requires a resourceKey' });
      continue;
    }
    if (seen.has(limit.resourceKey)) {
      issues.push({ severity: 'ERROR', message: `Duplicate limit declaration for resourceKey '${limit.resourceKey}'` });
    }
    seen.add(limit.resourceKey);

    if (limit.soft !== undefined && limit.soft < 0) {
      issues.push({ severity: 'ERROR', message: `Limit '${limit.resourceKey}' soft threshold cannot be negative` });
    }
    if (limit.hard !== undefined && limit.hard < 0) {
      issues.push({ severity: 'ERROR', message: `Limit '${limit.resourceKey}' hard threshold cannot be negative` });
    }
    if (limit.soft !== undefined && limit.hard !== undefined && limit.soft > limit.hard) {
      issues.push({ severity: 'ERROR', message: `Limit '${limit.resourceKey}' soft threshold cannot exceed its hard threshold` });
    }
    if (limit.graceThreshold !== undefined && limit.graceThreshold < 0) {
      issues.push({ severity: 'ERROR', message: `Limit '${limit.resourceKey}' graceThreshold cannot be negative` });
    }
  }

  return issues;
}

export function validatePlanPrices(prices: IPlanPrice[], supportedBillingCycles: string[]): IPlanValidationIssue[] {
  const issues: IPlanValidationIssue[] = [];

  for (const price of prices) {
    if (!price.currency || !/^[A-Z]{3}$/.test(price.currency)) {
      issues.push({ severity: 'ERROR', message: `Price entry has an invalid currency code '${price.currency}'` });
    }
    if (typeof price.amount !== 'number' || price.amount < 0) {
      issues.push({ severity: 'ERROR', message: `Price entry for '${price.currency}' requires a non-negative amount` });
    }
    if (!supportedBillingCycles.includes(price.billingCycle)) {
      issues.push({
        severity: 'ERROR',
        message: `Price entry billingCycle '${price.billingCycle}' is not in this plan's supportedBillingCycles`,
      });
    }
  }

  return issues;
}
