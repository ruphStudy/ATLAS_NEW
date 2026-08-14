import { Module } from '@nestjs/common';
import { BackupProviderRegistry } from './registry/backup-provider.registry';

/**
 * BackupProviderModule — the foundation for backup/restore integrations.
 * A generic, string-keyed registry + adapter contract; no concrete
 * backup provider is named or hardcoded anywhere in this module. Until
 * a real adapter registers itself, Disaster Recovery simply discovers
 * zero backups — a deliberate, safe default rather than a placeholder
 * implementation.
 */
@Module({
  providers: [BackupProviderRegistry],
  exports: [BackupProviderRegistry],
})
export class BackupProviderModule {}
