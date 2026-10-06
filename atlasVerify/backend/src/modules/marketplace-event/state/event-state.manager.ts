import { Injectable } from '@nestjs/common';
import { EventRepository } from '../repository/event.repository';
import { EventStatus } from '../interfaces';

@Injectable()
export class EventStateManager {
  constructor(private readonly repository: EventRepository) {}

  async markProcessing(eventId: string, workspaceId: string): Promise<void> {
    const event = await this.repository.getEvent(eventId, workspaceId);
    if (!event) return;

    await this.repository.updateEvent(eventId, workspaceId, {
      status: EventStatus.PROCESSING,
      attemptCount: event.attemptCount + 1,
    });

    await this.repository.createEventHistory({
      workspaceId,
      eventId,
      status: EventStatus.PROCESSING,
      attemptCount: event.attemptCount + 1,
    });
  }

  async markProcessed(eventId: string, workspaceId: string): Promise<void> {
    await this.repository.updateEvent(eventId, workspaceId, {
      status: EventStatus.PROCESSED,
      processedAt: new Date(),
    });

    await this.repository.createEventHistory({
      workspaceId,
      eventId,
      status: EventStatus.PROCESSED,
      attemptCount: 0,
    });
  }

  async markFailed(eventId: string, workspaceId: string, error: string): Promise<void> {
    const event = await this.repository.getEvent(eventId, workspaceId);
    if (!event) return;

    await this.repository.updateEvent(eventId, workspaceId, {
      status: EventStatus.FAILED,
      errorMessage: error,
    });

    await this.repository.createEventHistory({
      workspaceId,
      eventId,
      status: EventStatus.FAILED,
      attemptCount: event.attemptCount,
      errorMessage: error,
    });
  }

  async markCancelled(eventId: string, workspaceId: string): Promise<void> {
    await this.repository.updateEvent(eventId, workspaceId, {
      status: EventStatus.CANCELLED,
    });

    await this.repository.createEventHistory({
      workspaceId,
      eventId,
      status: EventStatus.CANCELLED,
      attemptCount: 0,
    });
  }

  async markDuplicate(eventId: string, workspaceId: string): Promise<void> {
    await this.repository.updateEvent(eventId, workspaceId, {
      status: EventStatus.DUPLICATE,
    });

    await this.repository.createEventHistory({
      workspaceId,
      eventId,
      status: EventStatus.DUPLICATE,
      attemptCount: 0,
    });
  }

  async markStale(eventId: string, workspaceId: string): Promise<void> {
    await this.repository.updateEvent(eventId, workspaceId, {
      status: EventStatus.STALE,
    });

    await this.repository.createEventHistory({
      workspaceId,
      eventId,
      status: EventStatus.STALE,
      attemptCount: 0,
    });
  }

  async checkDuplicate(
    workspaceId: string,
    accountId: string,
    externalEventId: string,
  ): Promise<boolean> {
    const existing = await this.repository.getEventByExternalId(workspaceId, accountId, externalEventId);
    return !!existing;
  }

  async checkIdempotency(
    workspaceId: string,
    accountId: string,
    idempotencyKey: string,
  ): Promise<any> {
    return this.repository.getEventByIdempotencyKey(workspaceId, accountId, idempotencyKey);
  }

  async shouldRetry(eventId: string, workspaceId: string): Promise<boolean> {
    const event = await this.repository.getEvent(eventId, workspaceId);
    if (!event) return false;

    return event.attemptCount < event.maxAttempts;
  }
}
