import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceApiVersion } from '../interfaces';

export interface ProviderVersionRecord {
  providerKey: string;
  current: MarketplaceApiVersion;
  supported: MarketplaceApiVersion[];
  deprecated: MarketplaceApiVersion[];
  minimumRequired?: MarketplaceApiVersion;
}

/**
 * Manages API version tracking for registered marketplace providers.
 * Providers self-register their version on startup.
 */
@Injectable()
export class MarketplaceVersionManager {
  private readonly logger = new Logger(MarketplaceVersionManager.name);
  private readonly versions = new Map<string, ProviderVersionRecord>();

  /**
   * Registers or updates the version record for a provider.
   */
  register(record: ProviderVersionRecord): void {
    this.versions.set(record.providerKey.toUpperCase(), record);
    this.logger.log(
      `Registered version for provider '${record.providerKey}': v${this.formatVersion(record.current)}`,
    );
  }

  /**
   * Returns the version record for a provider.
   */
  getRecord(providerKey: string): ProviderVersionRecord | null {
    return this.versions.get(providerKey.toUpperCase()) ?? null;
  }

  /**
   * Returns the current API version for a provider.
   */
  getCurrentVersion(providerKey: string): MarketplaceApiVersion | null {
    return this.versions.get(providerKey.toUpperCase())?.current ?? null;
  }

  /**
   * Returns whether a given version is supported.
   */
  isSupported(providerKey: string, version: MarketplaceApiVersion): boolean {
    const record = this.versions.get(providerKey.toUpperCase());
    if (!record) return false;
    return record.supported.some((v) => this.versionEquals(v, version));
  }

  /**
   * Returns whether a given version is deprecated.
   */
  isDeprecated(providerKey: string, version: MarketplaceApiVersion): boolean {
    const record = this.versions.get(providerKey.toUpperCase());
    if (!record) return false;
    return record.deprecated.some((v) => this.versionEquals(v, version));
  }

  /**
   * Returns true if the provider version meets the minimum requirement.
   */
  meetsMinimum(providerKey: string): boolean {
    const record = this.versions.get(providerKey.toUpperCase());
    if (!record?.minimumRequired) return true;
    return this.versionCompare(record.current, record.minimumRequired) >= 0;
  }

  /**
   * Returns all registered provider version records.
   */
  getAll(): ProviderVersionRecord[] {
    return Array.from(this.versions.values());
  }

  /**
   * Formats an API version as a human-readable string.
   */
  formatVersion(version: MarketplaceApiVersion): string {
    if (version.label) return version.label;
    return `${version.major}.${version.minor}.${version.patch}`;
  }

  // ── Internals ────────────────────────────────────────────────

  private versionEquals(a: MarketplaceApiVersion, b: MarketplaceApiVersion): boolean {
    return a.major === b.major && a.minor === b.minor && a.patch === b.patch;
  }

  /**
   * Returns > 0 if a > b, < 0 if a < b, 0 if equal.
   */
  private versionCompare(a: MarketplaceApiVersion, b: MarketplaceApiVersion): number {
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    return a.patch - b.patch;
  }
}
