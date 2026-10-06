import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { SearchFrameworkModule } from '@modules/search-framework/search-framework.module';
import { ActivityCenterModule } from '@modules/activity-center/activity-center.module';
import { GlobalSearchController } from './global-search.controller';
import { GlobalSearchService } from './global-search.service';
import { GlobalSearchRepository } from './global-search.repository';
import { GlobalSearchEventQueue, GlobalSearchEventWorker } from './jobs';

/**
 * GlobalSearchModule — the unified, cross-module search surface. Pure
 * consumer of `SearchFrameworkModule`: every document, index, provider,
 * permission-aware filter and query log is entirely the Search Framework's
 * — this module only adds grouping-by-entity-type/module, quick actions,
 * suggestions/autocomplete, saved searches, and "recent entities" (via the
 * Activity Center's personal feed, reused rather than duplicated). No
 * search backend/index of its own.
 */
@Module({
  imports: [DatabaseModule, SearchFrameworkModule, ActivityCenterModule, BullModule.registerQueue({ name: QUEUE_NAMES.GLOBAL_SEARCH_EVENTS })],
  controllers: [GlobalSearchController],
  providers: [GlobalSearchService, GlobalSearchRepository, GlobalSearchEventQueue, GlobalSearchEventWorker],
  exports: [GlobalSearchService],
})
export class GlobalSearchModule {}
