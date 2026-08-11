import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { OrganizationSettingsModule } from '@modules/organization-settings/organization-settings.module';
import { UserPreferencesModule } from '@modules/user-preferences/user-preferences.module';
import { LocalizationController } from './localization.controller';
import { LocalizationService } from './localization.service';
import { LocalizationRepository } from './localization.repository';
import { TranslationCacheService } from './translation-cache.service';
import { LocalizationEventQueue, LocalizationEventWorker } from './jobs';

/**
 * LocalizationModule — the central, provider-independent (built on `Intl`,
 * no external i18n library) localization framework: locale registry,
 * translation namespaces/keys/values with versioning, import/export,
 * missing-key detection, and locale-aware formatting/parsing/sorting.
 * "Which locale a context should use" is resolved through the *existing*
 * global→organization→workspace→user precedence — this module never stores
 * its own parallel locale-preference tier, only reads through
 * `OrganizationSettingsModule` (`organization.regional.locale`) and
 * `UserPreferencesModule` (`user.display.language`).
 */
@Module({
  imports: [
    DatabaseModule,
    OrganizationSettingsModule,
    UserPreferencesModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.LOCALIZATION_EVENTS,
    }),
  ],
  controllers: [LocalizationController],
  providers: [
    LocalizationService,
    LocalizationRepository,
    TranslationCacheService,
    LocalizationEventQueue,
    LocalizationEventWorker,
  ],
  exports: [LocalizationService],
})
export class LocalizationModule {}
