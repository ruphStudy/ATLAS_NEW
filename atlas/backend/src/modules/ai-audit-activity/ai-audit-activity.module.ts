import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { AiAuditActivityController } from './ai-audit-activity.controller';
import { AiAuditActivityService } from './ai-audit-activity.service';
import { AiAuditActivityRepository } from './ai-audit-activity.repository';
import { AiAuditEventQueue, AiAuditEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'ai-audit-events',
    }),
  ],
  controllers: [AiAuditActivityController],
  providers: [
    AiAuditActivityService,
    AiAuditActivityRepository,
    AiAuditEventQueue,
    AiAuditEventWorker,
  ],
  exports: [AiAuditActivityService, AiAuditActivityRepository],
})
export class AiAuditActivityModule {}
