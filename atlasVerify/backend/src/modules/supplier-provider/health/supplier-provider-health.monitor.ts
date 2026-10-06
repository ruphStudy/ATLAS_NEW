import { Injectable, Logger } from '@nestjs/common';
import {
  ISupplierProviderAdapter,
  ProviderHealthResult,
  ProviderHealthStatus,
  SupplierProviderCode,
} from '../interfaces';
import { SupplierProviderRegistry } from '../registry/supplier-provider.registry';

export interface HealthSnapshot {
  providerCode: SupplierProviderCode;
  result: ProviderHealthResult;
}

/**
 * Periodically polls all registered providers and caches health results.
 * Business modules call getHealth() to read cached results without triggering live checks.
 */
@Injectable()
export class SupplierProviderHealthMonitor {
  private readonly logger = new Logger(SupplierProviderHealthMonitor.name);
  private readonly cache = new Map<SupplierProviderCode, ProviderHealthResult>();

  constructor(private readonly registry: SupplierProviderRegistry) {}

  /**
   * Runs health checks for all registered providers and updates the cache.
   */
  async checkAll(): Promise<HealthSnapshot[]> {
    const adapters = this.registry.getAll();
    const results: HealthSnapshot[] = [];

    await Promise.allSettled(
      adapters.map(async (adapter) => {
        const result = await this.checkOne(adapter);
        this.cache.set(adapter.metadata.code, result);
        results.push({ providerCode: adapter.metadata.code, result });
      }),
    );

    return results;
  }

  /**
   * Checks a single provider and caches the result.
   */
  async checkOne(adapter: ISupplierProviderAdapter): Promise<ProviderHealthResult> {
    try {
      const result = await adapter.healthCheck();
      this.cache.set(adapter.metadata.code, result);
      this.logger.log(
        `[${adapter.metadata.code}] Health: ${result.status} (${result.latencyMs ?? '?'}ms)`,
      );
      return result;
    } catch (error) {
      const result: ProviderHealthResult = {
        providerCode: adapter.metadata.code,
        status: ProviderHealthStatus.UNHEALTHY,
        latencyMs: undefined,
        message: error instanceof Error ? error.message : 'Unknown error',
        checkedAt: new Date(),
      };
      this.cache.set(adapter.metadata.code, result);
      return result;
    }
  }

  /**
   * Returns the cached health result for a provider (does not re-check).
   */
  getHealth(providerCode: SupplierProviderCode): ProviderHealthResult | null {
    return this.cache.get(providerCode) ?? null;
  }

  /**
   * Returns all cached health results.
   */
  getAllHealth(): HealthSnapshot[] {
    return Array.from(this.cache.entries()).map(([providerCode, result]) => ({
      providerCode,
      result,
    }));
  }

  isHealthy(providerCode: SupplierProviderCode): boolean {
    const result = this.cache.get(providerCode);
    if (!result) return true; // Unknown → optimistic
    return result.status === ProviderHealthStatus.HEALTHY;
  }
}
