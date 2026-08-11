import { Injectable } from '@nestjs/common';
import { AccountValidationResult } from '../interfaces';
import { MP_ACCOUNT_CONSTANTS } from '../constants';

@Injectable()
export class AccountValidator {
  validate(data: {
    workspaceId?: unknown;
    providerKey?: unknown;
    marketplaceKey?: unknown;
    accountName?: unknown;
    externalAccountId?: unknown;
    priority?: unknown;
    timeoutMs?: unknown;
  }): AccountValidationResult {
    const errors: string[] = [];

    if (!data.workspaceId || typeof data.workspaceId !== 'string') {
      errors.push('workspaceId is required');
    }
    if (!data.providerKey || typeof data.providerKey !== 'string') {
      errors.push('providerKey is required');
    }
    if (!data.marketplaceKey || typeof data.marketplaceKey !== 'string') {
      errors.push('marketplaceKey is required');
    }
    if (!data.accountName || typeof data.accountName !== 'string') {
      errors.push('accountName is required');
    } else if ((data.accountName as string).length > MP_ACCOUNT_CONSTANTS.MAX_ACCOUNT_NAME_LENGTH) {
      errors.push(`accountName must not exceed ${MP_ACCOUNT_CONSTANTS.MAX_ACCOUNT_NAME_LENGTH} characters`);
    }
    if (!data.externalAccountId || typeof data.externalAccountId !== 'string') {
      errors.push('externalAccountId is required');
    }
    if (data.priority !== undefined && data.priority !== null) {
      const p = Number(data.priority);
      if (isNaN(p) || p < 0 || p > 1000) {
        errors.push('priority must be an integer between 0 and 1000');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  validateUpdate(data: { accountName?: unknown; priority?: unknown }): AccountValidationResult {
    const errors: string[] = [];

    if (data.accountName !== undefined && data.accountName !== null) {
      if (typeof data.accountName !== 'string' || (data.accountName as string).trim().length === 0) {
        errors.push('accountName must be a non-empty string');
      } else if ((data.accountName as string).length > MP_ACCOUNT_CONSTANTS.MAX_ACCOUNT_NAME_LENGTH) {
        errors.push(`accountName must not exceed ${MP_ACCOUNT_CONSTANTS.MAX_ACCOUNT_NAME_LENGTH} characters`);
      }
    }
    if (data.priority !== undefined && data.priority !== null) {
      const p = Number(data.priority);
      if (isNaN(p) || p < 0 || p > 1000) {
        errors.push('priority must be an integer between 0 and 1000');
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
