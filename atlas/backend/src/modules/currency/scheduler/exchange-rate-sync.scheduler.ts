import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

export interface SyncPairKey {
  baseCurrency: string;
  quoteCurrency: string;
  providerKey: string;
  workspaceId?: string | null;
}

export type SyncTickHandler = (pair: SyncPairKey) => Promise<void>;

/**
 * ExchangeRateSyncScheduler
 *
 * Drives periodic provider-based rate synchronization for configured
 * currency pairs. Uses `setInterval` — no external scheduler dependency —
 * mirroring `MarketplaceHealthCheckScheduler`. The scheduler itself knows
 * nothing about currencies or providers; `CurrencyService` supplies the
 * per-tick handler and owns what "sync" actually does (and how sync
 * failures are recorded/published).
 */
@Injectable()
export class ExchangeRateSyncScheduler implements OnModuleDestroy {
  private readonly logger = new Logger(ExchangeRateSyncScheduler.name);
  private readonly timers = new Map<string, ReturnType<typeof setInterval>>();

  onModuleDestroy(): void {
    for (const [key, timer] of this.timers.entries()) {
      clearInterval(timer);
      this.timers.delete(key);
    }
    this.logger.log('Exchange-rate sync scheduler stopped');
  }

  addPair(pair: SyncPairKey, intervalMs: number, onTick: SyncTickHandler): void {
    const key = this.buildKey(pair);
    if (this.timers.has(key)) return;

    const timer = setInterval(async () => {
      try {
        await onTick(pair);
      } catch (err) {
        this.logger.warn(
          `Scheduled sync failed for '${pair.baseCurrency}'→'${pair.quoteCurrency}' via '${pair.providerKey}': ${(err as Error).message}`,
        );
      }
    }, intervalMs);

    this.timers.set(key, timer);
    this.logger.log(`Scheduled rate sync for '${pair.baseCurrency}'→'${pair.quoteCurrency}' every ${intervalMs}ms`);
  }

  removePair(pair: SyncPairKey): void {
    const key = this.buildKey(pair);
    const timer = this.timers.get(key);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(key);
    }
  }

  private buildKey(pair: SyncPairKey): string {
    return [pair.baseCurrency.toUpperCase(), pair.quoteCurrency.toUpperCase(), pair.providerKey.toUpperCase(), pair.workspaceId ?? 'global'].join(':');
  }
}
