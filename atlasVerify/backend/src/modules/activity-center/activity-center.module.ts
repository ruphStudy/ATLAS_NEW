import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { ActivityCenterController } from './activity-center.controller';
import { ActivityCenterService } from './activity-center.service';
import { ActivityCenterRepository } from './activity-center.repository';
import { ActivityEventQueue, ActivityEventWorker } from './jobs';

/**
 * ActivityCenterModule — Activity Center
 *
 * Centralizes user-visible business activity across ATLAS modules into a
 * single, workspace-isolated feed — distinct from the Notification Center
 * (actionable, per-recipient, preference/channel-aware delivery) and from
 * each module's own audit/history tables (compliance source-of-truth,
 * untouched by this module). Any module calls `ActivityCenterService.record()`
 * after its own business logic completes — this module never duplicates
 * that logic or storage, it only records a lightweight, denormalized
 * reference to what happened (actor, action, source module, entity,
 * outcome, correlation/request/job/workflow/external ids, safe metadata).
 *
 * Provides personalized ("my activity"), workspace-wide and per-entity
 * feeds, timeline grouping, unread/read + pinned/archived/dismissed state,
 * deduplication (opt-in via `dedupeKey`) and retention pruning — the same
 * conventions established by the Notification Center.
 */
@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.ACTIVITY_EVENTS,
    }),
  ],
  controllers: [ActivityCenterController],
  providers: [
    ActivityCenterService,
    ActivityCenterRepository,
    ActivityEventQueue,
    ActivityEventWorker,
  ],
  exports: [ActivityCenterService, ActivityCenterRepository],
})
export class ActivityCenterModule {}
