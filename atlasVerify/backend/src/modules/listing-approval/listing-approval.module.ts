import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { ListingApprovalController } from './listing-approval.controller';
import { ListingApprovalService } from './listing-approval.service';
import { ListingApprovalRepository } from './listing-approval.repository';
import { ApprovalValidationEngine } from './engine/approval-validation.engine';
import {
  ListingApprovalEventQueue,
  ListingApprovalNotificationQueue,
  ListingApprovalEventWorker,
  ListingApprovalNotificationWorker,
} from './jobs';

@Module({
  imports: [DatabaseModule],
  controllers: [ListingApprovalController],
  providers: [
    ListingApprovalService,
    ListingApprovalRepository,
    ApprovalValidationEngine,
    ListingApprovalEventQueue,
    ListingApprovalNotificationQueue,
    ListingApprovalEventWorker,
    ListingApprovalNotificationWorker,
  ],
  exports: [ListingApprovalService],
})
export class ListingApprovalModule {}
