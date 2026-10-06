import { Injectable } from '@nestjs/common';
import {
  CatalogSyncRequest,
  SyncDirection,
  SyncScope,
  SyncValidationResult,
} from '../interfaces';
import { MP_CATALOG_SYNC_CONSTANTS } from '../constants';

@Injectable()
export class CatalogSyncValidator {
  validate(req: CatalogSyncRequest): SyncValidationResult {
    const errors: string[] = [];

    if (!req.workspaceId) errors.push('workspaceId is required');
    if (!req.accountId) errors.push('accountId is required');
    if (!req.providerKey) errors.push('providerKey is required');
    if (!req.marketplaceKey) errors.push('marketplaceKey is required');
    if (!req.direction || !Object.values(SyncDirection).includes(req.direction)) {
      errors.push(`direction must be one of: ${Object.values(SyncDirection).join(', ')}`);
    }
    if (!req.scope || !Object.values(SyncScope).includes(req.scope)) {
      errors.push(`scope must be one of: ${Object.values(SyncScope).join(', ')}`);
    }

    return { valid: errors.length === 0, errors };
  }

  validateSchedule(data: {
    workspaceId?: unknown;
    accountId?: unknown;
    providerKey?: unknown;
    marketplaceKey?: unknown;
    intervalMs?: unknown;
  }): SyncValidationResult {
    const errors: string[] = [];

    if (!data.workspaceId) errors.push('workspaceId is required');
    if (!data.accountId) errors.push('accountId is required');
    if (!data.providerKey) errors.push('providerKey is required');
    if (!data.marketplaceKey) errors.push('marketplaceKey is required');

    const interval = Number(data.intervalMs);
    if (isNaN(interval) || interval < MP_CATALOG_SYNC_CONSTANTS.MIN_SCHEDULE_INTERVAL_MS) {
      errors.push(`intervalMs must be at least ${MP_CATALOG_SYNC_CONSTANTS.MIN_SCHEDULE_INTERVAL_MS}ms (5 minutes)`);
    }

    return { valid: errors.length === 0, errors };
  }
}
