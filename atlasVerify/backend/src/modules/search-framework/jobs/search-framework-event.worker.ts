import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { SearchCacheService } from '../search-cache.service';
import { SEARCH_PROVIDER, ISearchProvider } from '../interfaces/search-provider.interface';
import { ISearchFrameworkEventPayload, ISearchDocument, SearchFrameworkEvent } from '../interfaces';

/**
 * SearchFrameworkEventWorker — the queue-based bulk indexer (`index-document`
 * jobs actually perform the provider upsert here, off the request path) and
 * the event-driven half of cache invalidation for every other lifecycle
 * event. Depends on the provider/cache directly rather than
 * `SearchFrameworkService` to avoid a circular dependency, mirroring how
 * `RolesPermissionsEventWorker` depends on `PermissionResolverService`
 * rather than the main `RolesPermissionsService`.
 */
@Processor(QUEUE_NAMES.SEARCH_FRAMEWORK_EVENTS)
export class SearchFrameworkEventWorker extends WorkerHost {
  private readonly logger = new Logger(SearchFrameworkEventWorker.name);

  constructor(
    @Inject(SEARCH_PROVIDER) private readonly searchProvider: ISearchProvider,
    private readonly cache: SearchCacheService,
  ) {
    super();
  }

  async process(job: Job<{ workspaceId: string; doc: Partial<ISearchDocument> } | ISearchFrameworkEventPayload>): Promise<void> {
    if (job.name === 'index-document') {
      const { workspaceId, doc } = job.data as { workspaceId: string; doc: Partial<ISearchDocument> };
      await this.searchProvider.index(doc);
      this.cache.invalidateWorkspace(workspaceId);
      return;
    }

    const payload = job.data as ISearchFrameworkEventPayload;
    this.logger.debug(`${payload.event}: ${payload.entityType ?? 'n/a'}:${payload.entityId ?? 'n/a'} for workspace ${payload.workspaceId ?? 'n/a'}`);

    if (
      payload.workspaceId &&
      (payload.event === SearchFrameworkEvent.DOCUMENT_INDEXED || payload.event === SearchFrameworkEvent.DOCUMENT_REMOVED)
    ) {
      this.cache.invalidateWorkspace(payload.workspaceId);
    }
  }
}
