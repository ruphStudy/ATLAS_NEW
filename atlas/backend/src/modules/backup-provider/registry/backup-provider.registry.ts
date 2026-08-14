import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BackupTargetType, IBackupProviderAdapter, IBackupProviderRegistry } from '../interfaces';

/**
 * BackupProviderRegistry
 *
 * Central in-memory registry for all IBackupProviderAdapter instances.
 * Business modules (Disaster Recovery) must only interact with backup
 * providers through this registry — no provider-specific logic lives
 * here. Registration is performed by whichever module supplies a
 * concrete adapter; this foundation module never registers one itself.
 */
@Injectable()
export class BackupProviderRegistry implements IBackupProviderRegistry {
  private readonly logger = new Logger(BackupProviderRegistry.name);
  private readonly adapters = new Map<string, IBackupProviderAdapter>();

  register(adapter: IBackupProviderAdapter): void {
    const key = adapter.metadata.providerKey.toUpperCase();
    this.adapters.set(key, adapter);
    this.logger.log(
      `Registered backup provider: ${key} v${adapter.metadata.version.major}.${adapter.metadata.version.minor}.${adapter.metadata.version.patch}`,
    );
  }

  get(providerKey: string): IBackupProviderAdapter {
    const key = providerKey.toUpperCase();
    const adapter = this.adapters.get(key);
    if (!adapter) {
      throw new NotFoundException(
        `Backup provider '${providerKey}' is not registered. Available: ${this.getSupportedKeys().join(', ')}`,
      );
    }
    return adapter;
  }

  getAll(): IBackupProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  isRegistered(providerKey: string): boolean {
    return this.adapters.has(providerKey.toUpperCase());
  }

  getSupportedKeys(): string[] {
    return Array.from(this.adapters.keys());
  }

  getCapable(targetType: BackupTargetType): IBackupProviderAdapter[] {
    return this.getAll().filter((a) => a.supportsTargetType(targetType));
  }
}
