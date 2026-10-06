import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { TranslationCacheService } from '../translation-cache.service';
import { ILocalizationEventPayload, LocalizationEvent } from '../interfaces';

/**
 * LocalizationEventWorker — the event-driven half of cache invalidation
 * (the service already invalidates synchronously in-process on write, so
 * the very next translate() call in the same request is always consistent;
 * this worker additionally consumes the published event so any other
 * consumer of `TranslationCacheService` in this process stays in sync too).
 */
@Processor(QUEUE_NAMES.LOCALIZATION_EVENTS)
export class LocalizationEventWorker extends WorkerHost {
  private readonly logger = new Logger(LocalizationEventWorker.name);

  constructor(private readonly cache: TranslationCacheService) {
    super();
  }

  async process(job: Job<ILocalizationEventPayload>): Promise<void> {
    const { event, namespaceKey, key } = job.data;
    this.logger.debug(`${event}: ${namespaceKey ?? 'n/a'}.${key ?? 'n/a'}`);

    if (event === LocalizationEvent.TRANSLATION_UPDATED || event === LocalizationEvent.TRANSLATIONS_IMPORTED) {
      if (namespaceKey && key) {
        this.cache.invalidateKey(namespaceKey, key);
      } else {
        this.cache.invalidateAll();
      }
    } else if (
      event === LocalizationEvent.LOCALE_ARCHIVED ||
      event === LocalizationEvent.DEFAULT_LOCALE_CHANGED ||
      event === LocalizationEvent.KEY_DELETED
    ) {
      this.cache.invalidateAll();
    }
  }
}
