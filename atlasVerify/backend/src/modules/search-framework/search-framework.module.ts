import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { RolesPermissionsModule } from '@modules/roles-permissions/roles-permissions.module';
import { SearchFrameworkController } from './search-framework.controller';
import { SearchFrameworkService } from './search-framework.service';
import { SearchFrameworkRepository } from './search-framework.repository';
import { SearchCacheService } from './search-cache.service';
import { PostgresSearchProvider } from './providers/postgres-search.provider';
import { SEARCH_PROVIDER } from './interfaces/search-provider.interface';
import { SearchFrameworkEventQueue, SearchFrameworkEventWorker } from './jobs';

/**
 * SearchFrameworkModule — a generic, reusable search framework for every
 * ATLAS module. Owning modules self-register into the searchable-entity
 * catalog and push their own documents in (directly or via the queue-based
 * bulk indexer); this module never encodes any owning module's business
 * rules, only the generic indexing/query/facet/cache machinery. Storage is
 * behind `ISearchProvider` (`SEARCH_PROVIDER` token) — the default
 * `PostgresSearchProvider` can be swapped for a dedicated search engine
 * later without touching any caller. Reuses `RolesPermissionsModule`'s
 * `PermissionResolverService` for permission-aware result filtering.
 */
@Module({
  imports: [
    DatabaseModule,
    RolesPermissionsModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.SEARCH_FRAMEWORK_EVENTS,
    }),
  ],
  controllers: [SearchFrameworkController],
  providers: [
    SearchFrameworkService,
    SearchFrameworkRepository,
    SearchCacheService,
    PostgresSearchProvider,
    {
      provide: SEARCH_PROVIDER,
      useExisting: PostgresSearchProvider,
    },
    SearchFrameworkEventQueue,
    SearchFrameworkEventWorker,
  ],
  exports: [SearchFrameworkService],
})
export class SearchFrameworkModule {}
