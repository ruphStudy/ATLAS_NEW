import { Injectable, Logger } from '@nestjs/common';
import {
  ISupplierProviderAdapter,
  ProviderCapability,
  SupplierProviderCode,
  WorkspaceProviderConfig,
} from '../interfaces';
import { SupplierProviderRegistry } from './supplier-provider.registry';
import { SUPPLIER_PROVIDER_CONSTANTS } from '../constants';

export interface ProviderSelectionOptions {
  workspaceId: string;
  capability: ProviderCapability;
  preferredCode?: SupplierProviderCode;
  configs?: WorkspaceProviderConfig[];
}

/**
 * Selects the best-available provider for a capability given workspace configuration.
 * Supports priority ordering, enable/disable, and failover.
 */
@Injectable()
export class SupplierProviderFactory {
  private readonly logger = new Logger(SupplierProviderFactory.name);

  constructor(private readonly registry: SupplierProviderRegistry) {}

  /**
   * Returns a single adapter for the workspace and capability.
   * If preferredCode is given and registered, it wins.
   * Otherwise the highest-priority enabled adapter is returned.
   */
  select(options: ProviderSelectionOptions): ISupplierProviderAdapter {
    const { capability, preferredCode, configs } = options;

    if (preferredCode && this.registry.isRegistered(preferredCode)) {
      const adapter = this.registry.get(preferredCode);
      if (adapter.supportsCapability(capability)) {
        return adapter;
      }
    }

    const candidates = this.registry
      .getCapable(capability)
      .filter((a) => this.isEnabled(a.metadata.code, configs));

    if (candidates.length === 0) {
      throw new Error(
        `No enabled provider supports capability '${capability}' for workspace '${options.workspaceId}'`,
      );
    }

    // Sort by workspace priority ascending (lower number = higher priority)
    candidates.sort((a, b) => {
      const pa = this.getPriority(a.metadata.code, configs);
      const pb = this.getPriority(b.metadata.code, configs);
      return pa - pb;
    });

    const selected = candidates[0]!;
    this.logger.debug(
      `Selected provider ${selected.metadata.code} for capability ${capability} in workspace ${options.workspaceId}`,
    );
    return selected;
  }

  /**
   * Returns all enabled adapters for a capability, ordered by priority.
   * Used for failover scenarios.
   */
  selectAll(options: ProviderSelectionOptions): ISupplierProviderAdapter[] {
    const { capability, configs } = options;

    const candidates = this.registry
      .getCapable(capability)
      .filter((a) => this.isEnabled(a.metadata.code, configs));

    return candidates.sort((a, b) => {
      const pa = this.getPriority(a.metadata.code, configs);
      const pb = this.getPriority(b.metadata.code, configs);
      return pa - pb;
    });
  }

  private isEnabled(code: SupplierProviderCode, configs?: WorkspaceProviderConfig[]): boolean {
    if (!configs) return true;
    const cfg = configs.find((c) => c.providerCode === code);
    return cfg ? cfg.isEnabled : true;
  }

  private getPriority(code: SupplierProviderCode, configs?: WorkspaceProviderConfig[]): number {
    if (!configs) return SUPPLIER_PROVIDER_CONSTANTS.DEFAULT_PRIORITY;
    const cfg = configs.find((c) => c.providerCode === code);
    return cfg ? cfg.priority : SUPPLIER_PROVIDER_CONSTANTS.DEFAULT_PRIORITY;
  }
}
