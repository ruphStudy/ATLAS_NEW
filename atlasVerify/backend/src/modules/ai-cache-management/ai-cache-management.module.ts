import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { AiCacheManagementController } from './ai-cache-management.controller';
import { AiCacheManagementService } from './ai-cache-management.service';
import { AiCacheManagementRepository } from './ai-cache-management.repository';
import { AiCacheEventQueue, AiCacheEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'ai-cache-events',
    }),
  ],
  controllers: [AiCacheManagementController],
  providers: [
    AiCacheManagementService,
    AiCacheManagementRepository,
    AiCacheEventQueue,
    AiCacheEventWorker,
  ],
  exports: [AiCacheManagementService, AiCacheManagementRepository],
})
export class AiCacheManagementModule {}
