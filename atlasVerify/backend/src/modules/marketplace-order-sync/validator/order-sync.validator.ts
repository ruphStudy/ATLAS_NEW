import { Injectable } from '@nestjs/common';
import { OrderSyncRequest } from '../interfaces';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

@Injectable()
export class OrderSyncValidator {
  validate(request: OrderSyncRequest): ValidationResult {
    const errors: string[] = [];

    if (!request.workspaceId?.trim()) errors.push('workspaceId is required');
    if (!request.accountId?.trim()) errors.push('accountId is required');
    if (!request.providerKey?.trim()) errors.push('providerKey is required');
    if (!request.marketplaceKey?.trim()) errors.push('marketplaceKey is required');

    return { valid: errors.length === 0, errors };
  }

  validateSchedule(data: {
    workspaceId: string;
    accountId: string;
    providerKey: string;
    marketplaceKey: string;
    intervalMs: number;
  }): ValidationResult {
    const errors: string[] = [];

    if (!data.workspaceId?.trim()) errors.push('workspaceId is required');
    if (!data.accountId?.trim()) errors.push('accountId is required');
    if (!data.providerKey?.trim()) errors.push('providerKey is required');
    if (!data.marketplaceKey?.trim()) errors.push('marketplaceKey is required');
    if (!data.intervalMs || data.intervalMs < 60000) errors.push('intervalMs must be at least 60000 (1 minute)');

    return { valid: errors.length === 0, errors };
  }
}
