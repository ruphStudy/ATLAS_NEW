import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { AiWorkflowModule } from '@modules/ai-workflow/ai-workflow.module';
import { AiAgentModule } from '@modules/ai-agent/ai-agent.module';
import { AiJobSchedulerController } from './ai-job-scheduler.controller';
import { AiJobSchedulerService } from './ai-job-scheduler.service';
import { AiJobSchedulerRepository } from './ai-job-scheduler.repository';
import { AiJobEventQueue, AiJobEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    AiWorkflowModule,
    AiAgentModule,
    BullModule.registerQueue({
      name: 'ai-job-events',
    }),
  ],
  controllers: [AiJobSchedulerController],
  providers: [
    AiJobSchedulerService,
    AiJobSchedulerRepository,
    AiJobEventQueue,
    AiJobEventWorker,
  ],
  exports: [AiJobSchedulerService, AiJobSchedulerRepository],
})
export class AiJobSchedulerModule {}
