import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { SettingsCacheService } from '../settings-cache.service';
import { ISettingsEventPayload, SettingScope } from '../interfaces';

/**
 * SettingsEventWorker — the event-driven half of cache invalidation. The
 * service already invalidates synchronously in-process on write (so the
 * very next read in the same request is always consistent); this worker
 * additionally consumes the published lifecycle event, so any other
 * consumer of `SettingsCacheService` in this process stays in sync too.
 */
@Processor(QUEUE_NAMES.SETTINGS_EVENTS)
export class SettingsEventWorker extends WorkerHost {
  private readonly logger = new Logger(SettingsEventWorker.name);

  constructor(private readonly cache: SettingsCacheService) {
    super();
  }

  async process(job: Job<ISettingsEventPayload>): Promise<void> {
    const { event, definitionKey, workspaceId, scope, moduleKey, userId } = job.data;
    this.logger.debug(`${event}: ${definitionKey} (${scope ?? 'n/a'}) for workspace ${workspaceId ?? 'n/a'}`);

    if (!workspaceId || !scope) {
      return;
    }

    switch (scope) {
      case SettingScope.GLOBAL:
      case SettingScope.ORGANIZATION:
        this.cache.invalidateAll();
        break;
      case SettingScope.WORKSPACE:
        this.cache.invalidateWorkspace(workspaceId);
        break;
      case SettingScope.MODULE:
        if (moduleKey) this.cache.invalidateModule(workspaceId, moduleKey);
        break;
      case SettingScope.USER:
        if (userId) this.cache.invalidateUser(workspaceId, userId);
        break;
    }
  }
}
