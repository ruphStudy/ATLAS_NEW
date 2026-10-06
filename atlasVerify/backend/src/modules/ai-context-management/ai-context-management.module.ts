import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { AiContextManagementController } from './ai-context-management.controller';
import { AiContextManagementService } from './ai-context-management.service';
import { AiContextManagementRepository } from './ai-context-management.repository';
import { AiContextEventQueue, AiContextEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'ai-context-events',
    }),
  ],
  controllers: [AiContextManagementController],
  providers: [
    AiContextManagementService,
    AiContextManagementRepository,
    AiContextEventQueue,
    AiContextEventWorker,
  ],
  exports: [AiContextManagementService, AiContextManagementRepository],
})
export class AiContextManagementModule {}
