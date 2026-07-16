import { Module } from '@nestjs/common';

/**
 * WorkersModule
 *
 * Responsibilities:
 *   - BullMQ worker process registration
 *   - Background job processors
 *
 * Workers (one per queue):
 *   - NotificationsWorker
 *   - ReportsWorker
 *   - MarketplaceSyncWorker
 *   - AiProcessingWorker
 *   - EmailWorker
 *
 * Note: Implementation deferred. Skeleton only.
 */
@Module({
  imports: [],
  providers: [],
})
export class WorkersModule {}
