import { Injectable, Logger } from '@nestjs/common';
import { IShippingProviderAdapter, ShippingHealthStatus, ShippingProviderHealthResult } from '../interfaces';
import { ShippingProviderRegistry } from '../registry/shipping-provider.registry';

export interface ShippingHealthSnapshot {
  providerKey: string;
  result: ShippingProviderHealthResult;
}

/**
 * Periodically polls all registered shipping providers and caches health
 * results. Business modules call getHealth() to read cached results
 * without triggering live checks.
 */
@Injectable()
export class ShippingProviderHealthMonitor {
  private readonly logger = new Logger(ShippingProviderHealthMonitor.name);
  private readonly cache = new Map<string, ShippingProviderHealthResult>();

  constructor(private readonly registry: ShippingProviderRegistry) {}

  async checkAll(): Promise<ShippingHealthSnapshot[]> {
    const adapters = this.registry.getAll();
    const results: ShippingHealthSnapshot[] = [];

    await Promise.allSettled(
      adapters.map(async (adapter) => {
        const result = await this.checkOne(adapter);
        results.push({ providerKey: adapter.metadata.providerKey, result });
      }),
    );

    return results;
  }

  async checkOne(adapter: IShippingProviderAdapter): Promise<ShippingProviderHealthResult> {
    const key = adapter.metadata.providerKey.toUpperCase();
    try {
      const result = await adapter.healthCheck();
      this.cache.set(key, result);
      this.logger.log(`[${key}] Health: ${result.status} (${result.latencyMs ?? '?'}ms)`);
      return result;
    } catch (error) {
      const result: ShippingProviderHealthResult = {
        providerKey: key,
        status: ShippingHealthStatus.UNHEALTHY,
        latencyMs: undefined,
        message: error instanceof Error ? error.message : 'Unknown error',
        checkedAt: new Date(),
      };
      this.cache.set(key, result);
      return result;
    }
  }

  getHealth(providerKey: string): ShippingProviderHealthResult | null {
    return this.cache.get(providerKey.toUpperCase()) ?? null;
  }

  getAllHealth(): ShippingHealthSnapshot[] {
    return Array.from(this.cache.entries()).map(([providerKey, result]) => ({ providerKey, result }));
  }

  isHealthy(providerKey: string): boolean {
    const result = this.cache.get(providerKey.toUpperCase());
    if (!result) return true; // Unknown → optimistic
    return result.status === ShippingHealthStatus.HEALTHY;
  }
}
