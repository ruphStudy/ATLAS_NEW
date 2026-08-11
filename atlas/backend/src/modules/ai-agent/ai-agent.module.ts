import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { AiOrchestratorModule } from '@modules/ai-orchestrator/ai-orchestrator.module';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';
import { AiAgentRepository } from './ai-agent.repository';
import { AiAgentEventQueue, AiAgentEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    AiOrchestratorModule,
    BullModule.registerQueue({
      name: 'ai-agent-events',
    }),
  ],
  controllers: [AiAgentController],
  providers: [
    AiAgentService,
    AiAgentRepository,
    AiAgentEventQueue,
    AiAgentEventWorker,
  ],
  exports: [AiAgentService, AiAgentRepository],
})
export class AiAgentModule {}
