import { Module } from '@nestjs/common';

/**
 * QueuesModule
 *
 * Responsibilities:
 *   - BullMQ queue registration
 *   - Queue configuration (concurrency, retry, backoff)
 *   - Queue dashboard (Bull Board) integration
 *
 * Queue Names (see constants/index.ts):
 *   - notifications
 *   - reports
 *   - marketplace-sync
 *   - ai-processing
 *   - email
 *
 * Note: Implementation deferred. Skeleton only.
 */
@Module({
  imports: [],
  providers: [],
  exports: [],
})
export class QueuesModule {}
