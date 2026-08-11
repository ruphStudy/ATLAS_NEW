import { Injectable } from '@nestjs/common';
import {
  ConflictStrategy,
  NormalizedReturnItem,
  ReturnConflictDetectionResult,
  ReturnConflictType,
} from '../interfaces';
import { ReturnSyncRepository } from '../repository/return-sync.repository';

@Injectable()
export class ReturnSyncConflictResolver {
  constructor(private readonly repository: ReturnSyncRepository) {}

  async detectConflict(
    normalized: NormalizedReturnItem,
    existingAtlasReturn: { id: string; status?: string; refundAmount?: number | null } | null,
    workspaceId: string,
    accountId: string,
  ): Promise<ReturnConflictDetectionResult> {
    if (!existingAtlasReturn) {
      return { hasConflict: false };
    }

    const details: { field: string; atlasValue: unknown; marketplaceValue: unknown }[] = [];

    if (existingAtlasReturn.status && normalized.status && existingAtlasReturn.status !== normalized.status) {
      details.push({
        field: 'status',
        atlasValue: existingAtlasReturn.status,
        marketplaceValue: normalized.status,
      });
    }

    if (existingAtlasReturn.refundAmount != null && normalized.totalRefundAmount != null && existingAtlasReturn.refundAmount !== normalized.totalRefundAmount) {
      details.push({
        field: 'refundAmount',
        atlasValue: existingAtlasReturn.refundAmount,
        marketplaceValue: normalized.totalRefundAmount,
      });
    }

    if (details.length === 0) {
      return { hasConflict: false };
    }

    const conflictType = details.some((d) => d.field === 'status')
      ? ReturnConflictType.STATUS_MISMATCH
      : ReturnConflictType.REFUND_AMOUNT_MISMATCH;

    return {
      hasConflict: true,
      conflictType,
      details,
    };
  }

  async resolve(
    conflictType: ReturnConflictType,
    normalized: NormalizedReturnItem,
    existingAtlasReturn: { id: string; status?: string } | null,
    strategy: ConflictStrategy,
    workspaceId: string,
    jobId: string,
    accountId: string,
  ): Promise<{ shouldUpdate: boolean; mergedData?: Partial<NormalizedReturnItem> }> {
    if (strategy === ConflictStrategy.SKIP) {
      return { shouldUpdate: false };
    }

    if (strategy === ConflictStrategy.FLAG) {
      await this.repository.createConflict({
        jobId,
        workspaceId,
        accountId,
        externalReturnId: normalized.externalReturnId,
        internalReturnId: existingAtlasReturn?.id ?? null,
        conflictType,
        details: { normalized, existing: existingAtlasReturn },
      });
      return { shouldUpdate: false };
    }

    if (strategy === ConflictStrategy.MARKETPLACE_WINS) {
      return { shouldUpdate: true, mergedData: normalized };
    }

    if (strategy === ConflictStrategy.ATLAS_WINS) {
      return { shouldUpdate: false };
    }

    if (strategy === ConflictStrategy.NEWEST_WINS) {
      return { shouldUpdate: true, mergedData: normalized };
    }

    return { shouldUpdate: false };
  }
}
