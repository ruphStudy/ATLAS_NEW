import { Module } from '@nestjs/common';
import { SettingsModule } from '@modules/settings/settings.module';
import { OrganizationSettingsController } from './organization-settings.controller';
import { OrganizationSettingsService } from './organization-settings.service';

/**
 * OrganizationSettingsModule — organization-wide profile, regional,
 * operational and policy settings. Pure consumer of `SettingsModule`: all
 * storage, validation, versioning, precedence resolution, caching and
 * lifecycle events are the shared Settings Framework's — this module only
 * owns the domain-specific catalog and friendly field-name mapping.
 */
@Module({
  imports: [SettingsModule],
  controllers: [OrganizationSettingsController],
  providers: [OrganizationSettingsService],
  exports: [OrganizationSettingsService],
})
export class OrganizationSettingsModule {}
