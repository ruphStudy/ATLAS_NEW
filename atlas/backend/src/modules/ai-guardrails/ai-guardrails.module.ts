import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { AiGuardrailsController } from './ai-guardrails.controller';
import { AiGuardrailsService } from './ai-guardrails.service';
import { AiGuardrailsRepository } from './ai-guardrails.repository';
import { AiGuardrailEventQueue, AiGuardrailEventWorker } from './jobs';
import {
  PatternMatchCheck,
  AllowlistCheck,
  BlocklistCheck,
  RolePermissionCheck,
  ToolPermissionCheck,
  ActionLimitCheck,
} from './checks';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.AI_GUARDRAIL_EVENTS,
    }),
  ],
  controllers: [AiGuardrailsController],
  providers: [
    AiGuardrailsService,
    AiGuardrailsRepository,
    AiGuardrailEventQueue,
    AiGuardrailEventWorker,
    PatternMatchCheck,
    AllowlistCheck,
    BlocklistCheck,
    RolePermissionCheck,
    ToolPermissionCheck,
    ActionLimitCheck,
  ],
  exports: [AiGuardrailsService, AiGuardrailsRepository],
})
export class AiGuardrailsModule {}
