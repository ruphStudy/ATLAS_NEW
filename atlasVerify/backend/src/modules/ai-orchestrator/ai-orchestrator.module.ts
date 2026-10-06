import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { AiModelManagementModule } from '@modules/ai-model-management/ai-model-management.module';
import { AiGuardrailsModule } from '@modules/ai-guardrails/ai-guardrails.module';
import { AiCostTrackingModule } from '@modules/ai-cost-tracking/ai-cost-tracking.module';
import { AiUsageTrackingModule } from '@modules/ai-usage-tracking/ai-usage-tracking.module';
import { AiOrchestratorController } from './ai-orchestrator.controller';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { AiOrchestratorRepository } from './ai-orchestrator.repository';
import { AiOrchestratorEventQueue, AiOrchestratorEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    AiModelManagementModule,
    AiGuardrailsModule,
    AiCostTrackingModule,
    AiUsageTrackingModule,
    BullModule.registerQueue({
      name: 'ai-orchestrator-events',
    }),
  ],
  controllers: [AiOrchestratorController],
  providers: [
    AiOrchestratorService,
    AiOrchestratorRepository,
    AiOrchestratorEventQueue,
    AiOrchestratorEventWorker,
  ],
  exports: [AiOrchestratorService, AiOrchestratorRepository],
})
export class AiOrchestratorModule {}
