import { Injectable, Logger } from '@nestjs/common';
import {
  EventProcessingContext,
  EventProcessingResult,
  EventProcessor,
  MarketplaceEventType,
} from '../interfaces';

@Injectable()
export class EventProcessorRegistry {
  private readonly logger = new Logger(EventProcessorRegistry.name);
  private readonly processors = new Map<string, EventProcessor>();

  registerProcessor(eventType: MarketplaceEventType, processor: EventProcessor): void {
    this.processors.set(eventType, processor);
    this.logger.log(`Registered processor for event type: ${eventType}`);
  }

  getProcessor(eventType: MarketplaceEventType): EventProcessor | undefined {
    return this.processors.get(eventType);
  }

  hasProcessor(eventType: MarketplaceEventType): boolean {
    return this.processors.has(eventType);
  }
}

@Injectable()
export class DefaultEventProcessor implements EventProcessor {
  private readonly logger = new Logger(DefaultEventProcessor.name);

  canProcess(eventType: MarketplaceEventType): boolean {
    return true;
  }

  async process(context: EventProcessingContext): Promise<EventProcessingResult> {
    this.logger.log(`Processing event ${context.eventId} of type ${context.eventType}`);

    try {
      // Default processing - log and mark as processed
      // Specific processors can be registered for each event type
      
      return {
        success: true,
        eventId: context.eventId,
        action: 'DEFAULT_PROCESSING',
        shouldRetry: false,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to process event ${context.eventId}: ${err.message}`);
      return {
        success: false,
        eventId: context.eventId,
        error: err.message,
        shouldRetry: true,
      };
    }
  }
}
