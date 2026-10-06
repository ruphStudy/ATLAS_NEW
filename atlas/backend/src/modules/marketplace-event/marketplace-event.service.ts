import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventRepository } from './repository/event.repository';
import { EventValidator } from './validator/event.validator';
import { EventStateManager } from './state/event-state.manager';
import { EventHandler } from './handler/event-handler';
import { EventProcessingQueue } from './queue/event-processing.queue';
import { EventMetrics } from './metrics/event.metrics';
import {
  SubmitEventRequestDto,
  EventFilterQueryDto,
  ReprocessEventRequestDto,
  CancelEventRequestDto,
} from './dto';
import { NormalizedMarketplaceEvent, EventStatus } from './interfaces';

@Injectable()
export class MarketplaceEventService {
  constructor(
    private readonly repository: EventRepository,
    private readonly validator: EventValidator,
    private readonly stateManager: EventStateManager,
    private readonly handler: EventHandler,
    private readonly processingQueue: EventProcessingQueue,
    private readonly metrics: EventMetrics,
  ) {}

  async submitEvent(dto: SubmitEventRequestDto) {
    const normalizedEvent: NormalizedMarketplaceEvent = {
      externalEventId: dto.externalEventId,
      externalEntityId: dto.payload.entityId,
      eventType: dto.eventType,
      providerEventType: dto.providerEventType,
      occurredAt: dto.occurredAt,
      version: dto.version,
      payload: dto.payload,
      metadata: dto.metadata,
      rawData: dto.payload,
    };

    const result = await this.handler.handleIncoming({
      workspaceId: dto.workspaceId,
      accountId: dto.accountId,
      providerKey: dto.providerKey,
      marketplaceKey: dto.marketplaceKey,
      source: dto.source,
      event: normalizedEvent,
      idempotencyKey: dto.idempotencyKey,
    });

    if (!result.accepted || !result.eventId) {
      throw new BadRequestException(result.reason);
    }

    return this.repository.getEvent(result.eventId, dto.workspaceId);
  }

  async findEvents(filter: EventFilterQueryDto) {
    return this.repository.findEvents(filter as any);
  }

  async getEvent(eventId: string, workspaceId: string) {
    const event = await this.repository.getEvent(eventId, workspaceId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  async getEventHistory(eventId: string, workspaceId: string) {
    return this.repository.getEventHistory(eventId, workspaceId);
  }

  async reprocessEvent(dto: ReprocessEventRequestDto) {
    const event = await this.repository.getEvent(dto.eventId, dto.workspaceId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.status === EventStatus.PROCESSED) {
      throw new BadRequestException('Event has already been processed');
    }

    if (event.status === EventStatus.PROCESSING) {
      throw new BadRequestException('Event is currently being processed');
    }

    const canRetry = await this.stateManager.shouldRetry(dto.eventId, dto.workspaceId);
    if (!canRetry) {
      throw new BadRequestException('Event has exceeded maximum retry attempts');
    }

    // Reset status to pending
    await this.repository.updateEvent(dto.eventId, dto.workspaceId, {
      status: EventStatus.PENDING,
      errorMessage: null,
    });

    // Re-enqueue
    await this.processingQueue.enqueue({
      eventId: event.id,
      workspaceId: event.workspaceId,
      accountId: event.accountId,
      providerKey: event.providerKey,
      marketplaceKey: event.marketplaceKey,
      eventType: event.eventType,
      category: event.category,
      priority: event.priority,
      payload: event.payload,
      attemptCount: event.attemptCount + 1,
      metadata: event.metadata,
    });

    return this.repository.getEvent(dto.eventId, dto.workspaceId);
  }

  async cancelEvent(dto: CancelEventRequestDto) {
    const event = await this.repository.getEvent(dto.eventId, dto.workspaceId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.status === EventStatus.PROCESSED) {
      throw new BadRequestException('Cannot cancel a processed event');
    }

    if (event.status === EventStatus.CANCELLED) {
      throw new BadRequestException('Event is already cancelled');
    }

    await this.stateManager.markCancelled(dto.eventId, dto.workspaceId);
    await this.processingQueue.cancelJob(`${dto.eventId}-${event.attemptCount}`);

    return this.repository.getEvent(dto.eventId, dto.workspaceId);
  }

  async getFailedEvents(workspaceId: string, accountId?: string, limit: number = 100) {
    return this.repository.getFailedEvents(workspaceId, accountId, limit);
  }

  async getPendingEvents(workspaceId: string, accountId?: string, limit: number = 100) {
    return this.repository.getPendingEvents(workspaceId, accountId, limit);
  }

  async getMetrics(workspaceId: string, accountId?: string) {
    return this.metrics.getMetrics(workspaceId, accountId);
  }
}
