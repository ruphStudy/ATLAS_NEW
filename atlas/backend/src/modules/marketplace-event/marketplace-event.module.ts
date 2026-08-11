import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';

import { EventRepository } from './repository/event.repository';
import { EventValidator } from './validator/event.validator';
import { EventStateManager } from './state/event-state.manager';
import { EventClassifier } from './classifier/event-classifier';
import { EventLifecycleQueue } from './events/event-lifecycle.queue';
import { EventProcessingQueue } from './queue/event-processing.queue';
import { EventProcessorRegistry, DefaultEventProcessor } from './processor/event-processor';
import { EventHandler } from './handler/event-handler';
import { EventMetrics } from './metrics/event.metrics';
import { MarketplaceEventService } from './marketplace-event.service';
import { MarketplaceEventController } from './marketplace-event.controller';
import { EventProcessingWorker } from './workers/event-processing.worker';

@Module({
  imports: [DatabaseModule],
  controllers: [MarketplaceEventController],
  providers: [
    EventRepository,
    EventValidator,
    EventStateManager,
    EventClassifier,
    EventLifecycleQueue,
    EventProcessingQueue,
    EventProcessorRegistry,
    DefaultEventProcessor,
    EventHandler,
    EventMetrics,
    MarketplaceEventService,
    EventProcessingWorker,
  ],
  exports: [
    MarketplaceEventService,
    EventMetrics,
    EventStateManager,
    EventRepository,
    EventHandler,
    EventProcessorRegistry,
  ],
})
export class MarketplaceEventModule {}
