import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { AiResponseValidationController } from './ai-response-validation.controller';
import { AiResponseValidationService } from './ai-response-validation.service';
import { AiResponseValidationRepository } from './ai-response-validation.repository';
import { AiValidationEventQueue, AiValidationEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'ai-validation-events',
    }),
  ],
  controllers: [AiResponseValidationController],
  providers: [
    AiResponseValidationService,
    AiResponseValidationRepository,
    AiValidationEventQueue,
    AiValidationEventWorker,
  ],
  exports: [AiResponseValidationService, AiResponseValidationRepository],
})
export class AiResponseValidationModule {}
