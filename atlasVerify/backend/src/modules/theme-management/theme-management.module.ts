import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { SettingsModule } from '@modules/settings/settings.module';
import { UserPreferencesModule } from '@modules/user-preferences/user-preferences.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { ThemeManagementController } from './theme-management.controller';
import { ThemeManagementService } from './theme-management.service';
import { ThemeManagementRepository } from './theme-management.repository';
import { ThemeCacheService } from './theme-cache.service';
import { ThemeManagementEventQueue, ThemeManagementEventWorker } from './jobs';

/**
 * ThemeManagementModule — the central, configuration-driven theme/design-token
 * framework. "Which theme/mode/density a context should use" is resolved
 * through the *existing* Settings Framework (global→organization→workspace
 * precedence, via `SettingsModule`) and User Preferences (`user.appearance.theme`,
 * `user.appearance.density`, via `UserPreferencesModule`) — this module never
 * duplicates that preference storage, only registers its own two new
 * settings (`theme.active-theme-key`, `theme.accent-color-override`).
 */
@Module({
  imports: [
    DatabaseModule,
    SettingsModule,
    UserPreferencesModule,
    AuditLogsModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.THEME_MANAGEMENT_EVENTS,
    }),
  ],
  controllers: [ThemeManagementController],
  providers: [
    ThemeManagementService,
    ThemeManagementRepository,
    ThemeCacheService,
    ThemeManagementEventQueue,
    ThemeManagementEventWorker,
  ],
  exports: [ThemeManagementService],
})
export class ThemeManagementModule {}
