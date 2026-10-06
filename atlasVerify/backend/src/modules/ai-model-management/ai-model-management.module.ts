import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { AiModelManagementController } from './ai-model-management.controller';
import { AiModelManagementService } from './ai-model-management.service';
import { AiModelManagementRepository } from './ai-model-management.repository';
import { AiModelEventQueue, AiModelEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'ai-model-events',
    }),
  ],
  controllers: [AiModelManagementController],
  providers: [
    AiModelManagementService,
    AiModelManagementRepository,
    AiModelEventQueue,
    AiModelEventWorker,
  ],
  exports: [AiModelManagementService, AiModelManagementRepository],
})
export class AiModelManagementModule {}
