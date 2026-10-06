import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsRepository } from './settings.repository';
import { SettingsCacheService } from './settings-cache.service';
import { SettingsEventQueue, SettingsEventWorker } from './jobs';

/**
 * SettingsModule — the shared settings framework: typed definitions
 * (catalog), scoped values (global/organization/workspace/module/user) with
 * a lifecycle (draft/published/disabled/archived), versioned history, and
 * deterministic precedence resolution with an event-invalidated cache.
 *
 * Module-specific settings values live here (as scoped `SettingValue` rows
 * tagged with `moduleKey`) but their *definitions* and business meaning stay
 * owned by the module that registers them — this module only hosts the
 * shared storage/resolution/versioning machinery, never module-specific
 * business logic.
 */
@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.SETTINGS_EVENTS,
    }),
  ],
  controllers: [SettingsController],
  providers: [
    SettingsService,
    SettingsRepository,
    SettingsCacheService,
    SettingsEventQueue,
    SettingsEventWorker,
  ],
  exports: [SettingsService, SettingsCacheService],
})
export class SettingsModule {}
