import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { AiDecisionEngineController } from './ai-decision-engine.controller';
import { AiDecisionEngineService } from './ai-decision-engine.service';
import { AiDecisionEngineRepository } from './ai-decision-engine.repository';
import { AiDecisionEventQueue, AiDecisionEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'ai-decision-events',
    }),
  ],
  controllers: [AiDecisionEngineController],
  providers: [
    AiDecisionEngineService,
    AiDecisionEngineRepository,
    AiDecisionEventQueue,
    AiDecisionEventWorker,
  ],
  exports: [AiDecisionEngineService, AiDecisionEngineRepository],
})
export class AiDecisionEngineModule {}
