import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { EventStatus, MarketplaceEventType, EventCategory, EventSource, EventPriority } from '../interfaces';

@Injectable()
export class EventRepository extends BaseRepository {
  private readonly eventModel = 'MarketplaceEvent';
  private readonly eventHistoryModel = 'MarketplaceEventHistory';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createEvent(data: {
    workspaceId: string;
    accountId: string;
    providerKey: string;
    marketplaceKey: string;
    externalEventId: string;
    eventType: MarketplaceEventType;
    category: EventCategory;
    source: EventSource;
    priority: EventPriority;
    status: EventStatus;
    version?: number;
    occurredAt: Date;
    receivedAt: Date;
    payload: Record<string, any>;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
    maxAttempts?: number;
  }) {
    return (this.prisma as any)[this.eventModel].create({
      data: {
        ...data,
        attemptCount: 0,
        maxAttempts: data.maxAttempts || 3,
      },
    });
  }

  async updateEvent(id: string, workspaceId: string, data: Partial<any>) {
    return (this.prisma as any)[this.eventModel].update({
      where: { id_workspaceId: { id, workspaceId } },
      data,
    });
  }

  async getEvent(id: string, workspaceId: string) {
    return (this.prisma as any)[this.eventModel].findUnique({
      where: { id_workspaceId: { id, workspaceId } },
    });
  }

  async getEventByExternalId(workspaceId: string, accountId: string, externalEventId: string) {
    return (this.prisma as any)[this.eventModel].findFirst({
      where: { workspaceId, accountId, externalEventId },
    });
  }

  async getEventByIdempotencyKey(workspaceId: string, accountId: string, idempotencyKey: string) {
    return (this.prisma as any)[this.eventModel].findFirst({
      where: { workspaceId, accountId, idempotencyKey },
    });
  }

  async findEvents(filter: {
    workspaceId: string;
    accountId?: string;
    providerKey?: string;
    eventType?: MarketplaceEventType;
    category?: EventCategory;
    status?: EventStatus;
    source?: EventSource;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, workspaceId, ...where } = filter;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      (this.prisma as any)[this.eventModel].findMany({
        where: { workspaceId, ...where },
        skip,
        take: limit,
        orderBy: { receivedAt: 'desc' },
      }),
      (this.prisma as any)[this.eventModel].count({
        where: { workspaceId, ...where },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createEventHistory(data: {
    workspaceId: string;
    eventId: string;
    status: EventStatus;
    attemptCount: number;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }) {
    return (this.prisma as any)[this.eventHistoryModel].create({ data });
  }

  async getEventHistory(eventId: string, workspaceId: string) {
    return (this.prisma as any)[this.eventHistoryModel].findMany({
      where: { eventId, workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFailedEvents(workspaceId: string, accountId?: string, limit: number = 100) {
    return (this.prisma as any)[this.eventModel].findMany({
      where: {
        workspaceId,
        ...(accountId && { accountId }),
        status: EventStatus.FAILED,
      },
      take: limit,
      orderBy: { receivedAt: 'desc' },
    });
  }

  async getPendingEvents(workspaceId: string, accountId?: string, limit: number = 100) {
    return (this.prisma as any)[this.eventModel].findMany({
      where: {
        workspaceId,
        ...(accountId && { accountId }),
        status: EventStatus.PENDING,
      },
      take: limit,
      orderBy: { priority: 'desc', receivedAt: 'asc' },
    });
  }

  async getMetrics(workspaceId: string, accountId?: string) {
    const where = { workspaceId, ...(accountId && { accountId }) };

    const [
      totalEvents,
      pendingEvents,
      processingEvents,
      processedEvents,
      failedEvents,
      duplicateEvents,
    ] = await Promise.all([
      (this.prisma as any)[this.eventModel].count({ where }),
      (this.prisma as any)[this.eventModel].count({
        where: { ...where, status: EventStatus.PENDING },
      }),
      (this.prisma as any)[this.eventModel].count({
        where: { ...where, status: EventStatus.PROCESSING },
      }),
      (this.prisma as any)[this.eventModel].count({
        where: { ...where, status: EventStatus.PROCESSED },
      }),
      (this.prisma as any)[this.eventModel].count({
        where: { ...where, status: EventStatus.FAILED },
      }),
      (this.prisma as any)[this.eventModel].count({
        where: { ...where, status: EventStatus.DUPLICATE },
      }),
    ]);

    return {
      totalEvents,
      pendingEvents,
      processingEvents,
      processedEvents,
      failedEvents,
      duplicateEvents,
      successRate: totalEvents > 0 ? (processedEvents / totalEvents) * 100 : 0,
    };
  }
}
