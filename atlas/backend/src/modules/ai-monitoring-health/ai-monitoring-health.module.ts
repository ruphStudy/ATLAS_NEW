import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { AiMonitoringHealthController } from './ai-monitoring-health.controller';
import { AiMonitoringHealthService } from './ai-monitoring-health.service';
import { AiMonitoringHealthRepository } from './ai-monitoring-health.repository';
import { AiHealthEventQueue, AiHealthEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'ai-health-events',
    }),
  ],
  controllers: [AiMonitoringHealthController],
  providers: [
    AiMonitoringHealthService,
    AiMonitoringHealthRepository,
    AiHealthEventQueue,
    AiHealthEventWorker,
  ],
  exports: [AiMonitoringHealthService, AiMonitoringHealthRepository],
})
export class AiMonitoringHealthModule {}
