import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsRepository } from './settings.repository';

/**
 * SettingsModule
 *
 * Responsibilities:
 *   - Workspace-level settings management
 *   - User-level preference management
 *   - Integration credential storage (encrypted)
 *   - Feature flag management
 *
 * Note: Implementation deferred. Skeleton only.
 */
@Module({
  controllers: [SettingsController],
  providers: [SettingsService, SettingsRepository],
  exports: [SettingsService],
})
export class SettingsModule {}
