import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { AiWorkflowModule } from '@modules/ai-workflow/ai-workflow.module';
import { AiAgentModule } from '@modules/ai-agent/ai-agent.module';
import { AiJobSchedulerModule } from '@modules/ai-job-scheduler/ai-job-scheduler.module';
import { AiQueueManagementController } from './ai-queue-management.controller';
import { AiQueueManagementService } from './ai-queue-management.service';
import { AiQueueManagementRepository } from './ai-queue-management.repository';
import { AiQueueEventQueue, AiQueueEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    AiWorkflowModule,
    AiAgentModule,
    AiJobSchedulerModule,
    BullModule.registerQueue({
      name: 'ai-queue-events',
    }),
  ],
  controllers: [AiQueueManagementController],
  providers: [
    AiQueueManagementService,
    AiQueueManagementRepository,
    AiQueueEventQueue,
    AiQueueEventWorker,
  ],
  exports: [AiQueueManagementService, AiQueueManagementRepository],
})
export class AiQueueManagementModule {}
