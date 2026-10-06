import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { AiPromptController } from './ai-prompt.controller';
import { AiPromptService } from './ai-prompt.service';
import { AiPromptRepository } from './ai-prompt.repository';
import { AiPromptEventQueue, AiPromptEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'ai-prompt-events',
    }),
  ],
  controllers: [AiPromptController],
  providers: [
    AiPromptService,
    AiPromptRepository,
    AiPromptEventQueue,
    AiPromptEventWorker,
  ],
  exports: [AiPromptService, AiPromptRepository],
})
export class AiPromptModule {}
