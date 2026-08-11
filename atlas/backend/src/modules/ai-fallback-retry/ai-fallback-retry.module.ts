import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { AiFallbackRetryController } from './ai-fallback-retry.controller';
import { AiFallbackRetryService } from './ai-fallback-retry.service';
import { AiFallbackRetryRepository } from './ai-fallback-retry.repository';
import { AiRetryEventQueue, AiRetryEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'ai-retry-events',
    }),
  ],
  controllers: [AiFallbackRetryController],
  providers: [
    AiFallbackRetryService,
    AiFallbackRetryRepository,
    AiRetryEventQueue,
    AiRetryEventWorker,
  ],
  exports: [AiFallbackRetryService, AiFallbackRetryRepository],
})
export class AiFallbackRetryModule {}
