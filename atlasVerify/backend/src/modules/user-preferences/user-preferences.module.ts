import { Module } from '@nestjs/common';
import { SettingsModule } from '@modules/settings/settings.module';
import { UserPreferencesController } from './user-preferences.controller';
import { UserPreferencesService } from './user-preferences.service';

/**
 * UserPreferencesModule — user-level display, notification, workspace-view,
 * defaults, appearance and AI preferences. Pure consumer of `SettingsModule`,
 * mirroring `OrganizationSettingsModule`'s approach: all storage, validation,
 * versioning, USER-scope precedence resolution, caching and lifecycle events
 * are the shared Settings Framework's — this module only owns the
 * domain-specific catalog and friendly field-name mapping.
 */
@Module({
  imports: [SettingsModule],
  controllers: [UserPreferencesController],
  providers: [UserPreferencesService],
  exports: [UserPreferencesService],
})
export class UserPreferencesModule {}
