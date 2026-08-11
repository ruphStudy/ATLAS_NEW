import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { AiOrchestratorModule } from '@modules/ai-orchestrator/ai-orchestrator.module';
import { AiAgentModule } from '@modules/ai-agent/ai-agent.module';
import { AiWorkflowController } from './ai-workflow.controller';
import { AiWorkflowService } from './ai-workflow.service';
import { AiWorkflowRepository } from './ai-workflow.repository';
import { AiWorkflowEventQueue, AiWorkflowEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    AiOrchestratorModule,
    AiAgentModule,
    BullModule.registerQueue({
      name: 'ai-workflow-events',
    }),
  ],
  controllers: [AiWorkflowController],
  providers: [
    AiWorkflowService,
    AiWorkflowRepository,
    AiWorkflowEventQueue,
    AiWorkflowEventWorker,
  ],
  exports: [AiWorkflowService, AiWorkflowRepository],
})
export class AiWorkflowModule {}
