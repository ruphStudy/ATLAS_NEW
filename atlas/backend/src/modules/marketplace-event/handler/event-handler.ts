import { Injectable, Logger } from '@nestjs/common';
import { EventRepository } from '../repository/event.repository';
import { EventValidator } from '../validator/event.validator';
import { EventStateManager } from '../state/event-state.manager';
import { EventClassifier } from '../classifier/event-classifier';
import { EventLifecycleQueue } from '../events/event-lifecycle.queue';
import { EventProcessingQueue } from '../queue/event-processing.queue';
import { EventProcessorRegistry, DefaultEventProcessor } from '../processor/event-processor';
import {
  NormalizedMarketplaceEvent,
  EventStatus,
  EventLifecycleEvent,
  EventSource,
  EventProcessingContext,
} from '../interfaces';

@Injectable()
export class EventHandler {
  private readonly logger = new Logger(EventHandler.name);

  constructor(
    private readonly repository: EventRepository,
    private readonly validator: EventValidator,
    private readonly stateManager: EventStateManager,
    private readonly classifier: EventClassifier,
    private readonly lifecycleQueue: EventLifecycleQueue,
    private readonly processingQueue: EventProcessingQueue,
    private readonly processorRegistry: EventProcessorRegistry,
    private readonly defaultProcessor: DefaultEventProcessor,
  ) {}

  async handleIncoming(params: {
    workspaceId: string;
    accountId: string;
    providerKey: string;
    marketplaceKey: string;
    source: EventSource;
    event: NormalizedMarketplaceEvent;
    idempotencyKey?: string;
  }): Promise<{ accepted: boolean; eventId?: string; reason?: string }> {
    try {
      // Validate incoming event
      this.validator.validateIncomingEvent({
        workspaceId: params.workspaceId,
        accountId: params.accountId,
        providerKey: params.providerKey,
        marketplaceKey: params.marketplaceKey,
        event: params.event,
      });

      // Check for duplicate
      const isDuplicate = await this.stateManager.checkDuplicate(
        params.workspaceId,
        params.accountId,
        params.event.externalEventId,
      );

      if (isDuplicate) {
        this.logger.warn(`Duplicate event detected: ${params.event.externalEventId}`);
        await this.lifecycleQueue.publish({
          event: EventLifecycleEvent.EVENT_DUPLICATE,
          workspaceId: params.workspaceId,
          accountId: params.accountId,
          eventType: params.event.eventType,
          data: { externalEventId: params.event.externalEventId },
        });
        return { accepted: false, reason: 'Duplicate event' };
      }

      // Check idempotency key if provided
      if (params.idempotencyKey) {
        const existingEvent = await this.stateManager.checkIdempotency(
          params.workspaceId,
          params.accountId,
          params.idempotencyKey,
        );
        if (existingEvent) {
          this.logger.warn(`Idempotent event detected: ${params.idempotencyKey}`);
          return { accepted: true, eventId: existingEvent.id, reason: 'Idempotent event' };
        }
      }

      // Classify event
      const classification = this.classifier.classify(params.event.eventType);

      if (!classification.shouldProcess) {
        this.logger.warn(`Event type ${params.event.eventType} is not supported for processing`);
        return { accepted: false, reason: classification.reason };
      }

      // Create event record
      const eventRecord = await this.repository.createEvent({
        workspaceId: params.workspaceId,
        accountId: params.accountId,
        providerKey: params.providerKey,
        marketplaceKey: params.marketplaceKey,
        externalEventId: params.event.externalEventId,
        eventType: params.event.eventType,
        category: classification.category,
        source: params.source,
        priority: classification.priority,
        status: EventStatus.PENDING,
        version: params.event.version,
        occurredAt: params.event.occurredAt,
        receivedAt: new Date(),
        payload: params.event.payload,
        metadata: {
          ...params.event.metadata,
          providerEventType: params.event.providerEventType,
          rawData: params.event.rawData,
        },
        idempotencyKey: params.idempotencyKey,
      });

      // Publish lifecycle events
      await this.lifecycleQueue.publish({
        event: EventLifecycleEvent.EVENT_RECEIVED,
        workspaceId: params.workspaceId,
        accountId: params.accountId,
        eventId: eventRecord.id,
        eventType: params.event.eventType,
      });

      await this.lifecycleQueue.publish({
        event: EventLifecycleEvent.EVENT_CLASSIFIED,
        workspaceId: params.workspaceId,
        accountId: params.accountId,
        eventId: eventRecord.id,
        eventType: params.event.eventType,
        data: { category: classification.category, priority: classification.priority },
      });

      // Enqueue for processing
      await this.processingQueue.enqueue({
        eventId: eventRecord.id,
        workspaceId: params.workspaceId,
        accountId: params.accountId,
        providerKey: params.providerKey,
        marketplaceKey: params.marketplaceKey,
        eventType: params.event.eventType,
        category: classification.category,
        priority: classification.priority,
        payload: params.event.payload,
        attemptCount: 1,
        metadata: eventRecord.metadata,
      });

      await this.lifecycleQueue.publish({
        event: EventLifecycleEvent.EVENT_QUEUED,
        workspaceId: params.workspaceId,
        accountId: params.accountId,
        eventId: eventRecord.id,
        eventType: params.event.eventType,
      });

      return { accepted: true, eventId: eventRecord.id };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to handle incoming event: ${err.message}`, err.stack);
      return { accepted: false, reason: err.message };
    }
  }

  async processEvent(params: {
    eventId: string;
    workspaceId: string;
    accountId: string;
    providerKey: string;
    marketplaceKey: string;
    eventType: any;
    category: any;
    payload: Record<string, any>;
    attemptCount: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      // Mark as processing
      await this.stateManager.markProcessing(params.eventId, params.workspaceId);

      await this.lifecycleQueue.publish({
        event: EventLifecycleEvent.EVENT_PROCESSING,
        workspaceId: params.workspaceId,
        accountId: params.accountId,
        eventId: params.eventId,
        eventType: params.eventType,
      });

      // Get processor
      const processor = this.processorRegistry.getProcessor(params.eventType) || this.defaultProcessor;

      // Create processing context
      const context: EventProcessingContext = {
        eventId: params.eventId,
        workspaceId: params.workspaceId,
        accountId: params.accountId,
        providerKey: params.providerKey,
        marketplaceKey: params.marketplaceKey,
        eventType: params.eventType,
        category: params.category,
        attemptCount: params.attemptCount,
        payload: params.payload,
        metadata: params.metadata,
      };

      // Process event
      const result = await processor.process(context);

      if (result.success) {
        // Mark as processed
        await this.stateManager.markProcessed(params.eventId, params.workspaceId);

        await this.lifecycleQueue.publish({
          event: EventLifecycleEvent.EVENT_PROCESSED,
          workspaceId: params.workspaceId,
          accountId: params.accountId,
          eventId: params.eventId,
          eventType: params.eventType,
          data: { action: result.action, entityId: result.entityId },
        });
      } else {
        // Mark as failed
        await this.stateManager.markFailed(params.eventId, params.workspaceId, result.error ?? 'Unknown error');

        await this.lifecycleQueue.publish({
          event: EventLifecycleEvent.EVENT_FAILED,
          workspaceId: params.workspaceId,
          accountId: params.accountId,
          eventId: params.eventId,
          eventType: params.eventType,
          data: { error: result.error, shouldRetry: result.shouldRetry },
        });

        if (result.shouldRetry) {
          throw new Error(result.error);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process event ${params.eventId}: ${(error as Error).message}`);
      throw error;
    }
  }
}
