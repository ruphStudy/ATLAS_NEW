import { Injectable, Logger } from '@nestjs/common';
import { IMonitoringSourceAdapter } from '../interfaces';

/**
 * MonitoringSourceRegistry
 *
 * Central registry of `IMonitoringSourceAdapter` wrappers, one per
 * aggregated health/monitoring module. Mirrors the provider-registry
 * pattern used throughout this codebase (register/get/getAll), but here
 * every built-in adapter wraps an already-existing service's own
 * summary method — this registry never collects raw signals itself.
 * Future modules can register their own adapter the same way owning
 * modules register step executors/rule action handlers elsewhere in
 * this codebase.
 */
@Injectable()
export class MonitoringSourceRegistry {
  private readonly logger = new Logger(MonitoringSourceRegistry.name);
  private readonly adapters = new Map<string, IMonitoringSourceAdapter>();

  register(adapter: IMonitoringSourceAdapter): void {
    if (this.adapters.has(adapter.sourceKey)) {
      this.logger.warn(`Overwriting existing monitoring source adapter for '${adapter.sourceKey}'`);
    }
    this.adapters.set(adapter.sourceKey, adapter);
  }

  get(sourceKey: string): IMonitoringSourceAdapter | undefined {
    return this.adapters.get(sourceKey);
  }

  getAll(): IMonitoringSourceAdapter[] {
    return Array.from(this.adapters.values());
  }

  isRegistered(sourceKey: string): boolean {
    return this.adapters.has(sourceKey);
  }

  getSupportedKeys(): string[] {
    return Array.from(this.adapters.keys());
  }
}
