import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ThemeCacheService } from '../theme-cache.service';
import { IThemeManagementEventPayload, ThemeManagementEvent } from '../interfaces';

@Processor(QUEUE_NAMES.THEME_MANAGEMENT_EVENTS)
export class ThemeManagementEventWorker extends WorkerHost {
  private readonly logger = new Logger(ThemeManagementEventWorker.name);

  constructor(private readonly cache: ThemeCacheService) {
    super();
  }

  async process(job: Job<IThemeManagementEventPayload>): Promise<void> {
    const { event, workspaceId, themeId } = job.data;
    this.logger.debug(`${event}: theme ${themeId ?? 'n/a'} for workspace ${workspaceId ?? 'n/a'}`);

    if (event === ThemeManagementEvent.THEME_PUBLISHED || event === ThemeManagementEvent.THEME_ROLLED_BACK) {
      // A published/rolled-back theme can be active for any number of workspaces referencing its key —
      // clearing the whole cache is the same trade-off the Settings Framework makes for GLOBAL writes.
      this.cache.invalidateAll();
    } else if (workspaceId && event === ThemeManagementEvent.ACTIVE_THEME_CHANGED) {
      this.cache.invalidateWorkspace(workspaceId);
    }
  }
}
