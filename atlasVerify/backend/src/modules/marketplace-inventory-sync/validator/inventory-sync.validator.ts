import { Injectable } from '@nestjs/common';
import { InventorySyncRequest, InventorySyncValidationResult } from '../interfaces';
import { MP_INVENTORY_SYNC_CONSTANTS } from '../constants';

@Injectable()
export class InventorySyncValidator {
  validate(request: Partial<InventorySyncRequest>): InventorySyncValidationResult {
    const errors: string[] = [];

    if (!request.workspaceId?.trim()) errors.push('workspaceId is required');
    if (!request.accountId?.trim()) errors.push('accountId is required');
    if (!request.providerKey?.trim()) errors.push('providerKey is required');
    if (!request.marketplaceKey?.trim()) errors.push('marketplaceKey is required');

    return { valid: errors.length === 0, errors };
  }

  validateSchedule(data: {
    workspaceId?: string;
    accountId?: string;
    providerKey?: string;
    marketplaceKey?: string;
    intervalMs?: number;
  }): InventorySyncValidationResult {
    const errors: string[] = [];

    if (!data.workspaceId?.trim()) errors.push('workspaceId is required');
    if (!data.accountId?.trim()) errors.push('accountId is required');
    if (!data.providerKey?.trim()) errors.push('providerKey is required');
    if (!data.marketplaceKey?.trim()) errors.push('marketplaceKey is required');
    if (!data.intervalMs || data.intervalMs < MP_INVENTORY_SYNC_CONSTANTS.MIN_SCHEDULE_INTERVAL_MS) {
      errors.push(`intervalMs must be at least ${MP_INVENTORY_SYNC_CONSTANTS.MIN_SCHEDULE_INTERVAL_MS}ms`);
    }

    return { valid: errors.length === 0, errors };
  }
}
