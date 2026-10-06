import { Injectable } from '@nestjs/common';
import { InventoryAllocationStrategy } from '../interfaces';

export interface AllocationCandidate {
  warehouseId: string;
  locationId: string | null;
  batchId: string | null;
  quantity: number;
  bucketCreatedAt: Date;
  warehouse: Record<string, unknown> | null;
  batch: Record<string, unknown> | null;
}

export interface ScoredAllocationCandidate extends AllocationCandidate {
  score: number;
  reason: string;
}

export interface AllocationStrategyContext {
  referenceWarehouse?: Record<string, unknown> | null;
}

/**
 * Pure ranking logic for the allocation engine's configurable strategies.
 * Higher `score` is allocated from first. Never mutates stock — callers execute
 * the resulting plan through InventoryReservationService/InventoryStockService.
 */
@Injectable()
export class InventoryAllocationStrategyEngine {
  rank(
    strategy: InventoryAllocationStrategy,
    candidates: AllocationCandidate[],
    context: AllocationStrategyContext = {},
  ): ScoredAllocationCandidate[] {
    return candidates
      .map((candidate) => this.score(strategy, candidate, context))
      .sort((a, b) => b.score - a.score);
  }

  private score(
    strategy: InventoryAllocationStrategy,
    candidate: AllocationCandidate,
    context: AllocationStrategyContext,
  ): ScoredAllocationCandidate {
    switch (strategy) {
      case InventoryAllocationStrategy.FIFO:
        return this.scoreFifo(candidate);
      case InventoryAllocationStrategy.FEFO:
        return this.scoreFefo(candidate);
      case InventoryAllocationStrategy.LIFO:
        return this.scoreLifo(candidate);
      case InventoryAllocationStrategy.NEAREST_WAREHOUSE:
        return this.scoreNearestWarehouse(candidate, context);
      case InventoryAllocationStrategy.LOWEST_FULFILLMENT_COST:
        return this.scoreLowestFulfillmentCost(candidate);
      case InventoryAllocationStrategy.PRIORITY_WAREHOUSE:
        return this.scorePriorityWarehouse(candidate);
      case InventoryAllocationStrategy.HIGHEST_AVAILABLE_STOCK:
      default:
        return this.scoreHighestAvailableStock(candidate);
    }
  }

  private receivedAt(candidate: AllocationCandidate): number {
    const receivedDate = candidate.batch?.['receivedDate'] as Date | string | undefined;
    return receivedDate ? new Date(receivedDate).getTime() : candidate.bucketCreatedAt.getTime();
  }

  private scoreFifo(candidate: AllocationCandidate): ScoredAllocationCandidate {
    const receivedAt = this.receivedAt(candidate);
    return {
      ...candidate,
      score: -receivedAt,
      reason: candidate.batch
        ? `FIFO: received ${new Date(receivedAt).toISOString()}`
        : 'FIFO: ordered by stock age (no batch)',
    };
  }

  private scoreLifo(candidate: AllocationCandidate): ScoredAllocationCandidate {
    const receivedAt = this.receivedAt(candidate);
    return {
      ...candidate,
      score: receivedAt,
      reason: candidate.batch
        ? `LIFO: received ${new Date(receivedAt).toISOString()}`
        : 'LIFO: ordered by stock age (no batch)',
    };
  }

  private scoreFefo(candidate: AllocationCandidate): ScoredAllocationCandidate {
    const expiryDate = candidate.batch?.['expiryDate'] as Date | string | null | undefined;
    const expiryAt = expiryDate ? new Date(expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
    return {
      ...candidate,
      score: -expiryAt,
      reason: expiryDate
        ? `FEFO: expires ${new Date(expiryAt).toISOString()}`
        : 'FEFO: no expiry on this batch (lowest priority)',
    };
  }

  private scoreNearestWarehouse(
    candidate: AllocationCandidate,
    context: AllocationStrategyContext,
  ): ScoredAllocationCandidate {
    const ref = context.referenceWarehouse;
    if (!ref) {
      return { ...candidate, score: 0, reason: 'Nearest warehouse: no reference warehouse provided' };
    }
    if (candidate.warehouseId === ref['id']) {
      return { ...candidate, score: 3, reason: 'Nearest warehouse: exact match' };
    }
    if (candidate.warehouse?.['country'] && candidate.warehouse['country'] === ref['country']) {
      return {
        ...candidate,
        score: 2,
        reason: `Nearest warehouse: same country (${ref['country']})`,
      };
    }
    if (candidate.warehouse?.['state'] && candidate.warehouse['state'] === ref['state']) {
      return { ...candidate, score: 1, reason: `Nearest warehouse: same state (${ref['state']})` };
    }
    return { ...candidate, score: 0, reason: 'Nearest warehouse: no proximity match' };
  }

  private scoreLowestFulfillmentCost(candidate: AllocationCandidate): ScoredAllocationCandidate {
    const metadata = (candidate.warehouse?.['metadata'] as Record<string, unknown> | null) ?? {};
    const cost = typeof metadata['fulfillmentCost'] === 'number' ? (metadata['fulfillmentCost'] as number) : 0;
    return {
      ...candidate,
      score: -cost,
      reason: `Lowest fulfillment cost: cost=${cost}`,
    };
  }

  private scoreHighestAvailableStock(candidate: AllocationCandidate): ScoredAllocationCandidate {
    return {
      ...candidate,
      score: candidate.quantity,
      reason: `Highest available stock: ${candidate.quantity} available`,
    };
  }

  private scorePriorityWarehouse(candidate: AllocationCandidate): ScoredAllocationCandidate {
    const metadata = (candidate.warehouse?.['metadata'] as Record<string, unknown> | null) ?? {};
    const priority =
      typeof metadata['priority'] === 'number'
        ? (metadata['priority'] as number)
        : candidate.warehouse?.['isDefault']
          ? 1
          : 0;
    return {
      ...candidate,
      score: priority,
      reason: `Priority warehouse: priority=${priority}`,
    };
  }
}
