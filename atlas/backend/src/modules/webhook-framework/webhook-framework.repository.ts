import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { WebhookEndpointStatus, IWebhookDelivery, IWebhookEndpoint, IWebhookHistory } from './interfaces';
import { WebhookFilterDto, DeliveryFilterDto } from './dto';

@Injectable()
export class WebhookFrameworkRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Endpoints ────────────────────────────────────────────────────

  async create(data: Partial<IWebhookEndpoint>): Promise<IWebhookEndpoint> {
    return this.prisma.webhookEndpoint.create({ data: data as any }) as Promise<IWebhookEndpoint>;
  }

  async findById(id: string): Promise<IWebhookEndpoint | null> {
    return this.prisma.webhookEndpoint.findFirst({ where: { id } }) as Promise<IWebhookEndpoint | null>;
  }

  async findByScopeKeyAndName(scopeKey: string, name: string): Promise<IWebhookEndpoint | null> {
    return this.prisma.webhookEndpoint.findFirst({ where: { scopeKey, name } }) as Promise<IWebhookEndpoint | null>;
  }

  async findAll(workspaceId: string, filter: WebhookFilterDto): Promise<[IWebhookEndpoint[], number]> {
    const where: Record<string, unknown> = { workspaceId };
    if (filter.scopeType) where.scopeType = filter.scopeType;
    if (filter.status) where.status = filter.status;
    if (filter.healthStatus) where.healthStatus = filter.healthStatus;
    if (filter.search) {
      where.OR = [{ name: { contains: filter.search, mode: 'insensitive' } }, { url: { contains: filter.search, mode: 'insensitive' } }];
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.webhookEndpoint.findMany({ where: where as any, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.webhookEndpoint.count({ where: where as any }),
    ]);

    return [data as IWebhookEndpoint[], total];
  }

  /** Endpoints eligible to receive a dispatched event: ACTIVE, subscribed to the event type, and visible to either the dispatching workspace or (if provided) its organization. */
  async findActiveSubscribedEndpoints(workspaceId: string, organizationId: string | undefined, eventType: string): Promise<IWebhookEndpoint[]> {
    const scopeMatch = organizationId ? { OR: [{ workspaceId }, { organizationId }] } : { workspaceId };

    return this.prisma.webhookEndpoint.findMany({
      where: {
        ...scopeMatch,
        status: WebhookEndpointStatus.ACTIVE as any,
        eventTypes: { has: eventType },
      } as any,
    }) as Promise<IWebhookEndpoint[]>;
  }

  async update(id: string, data: Partial<IWebhookEndpoint>): Promise<IWebhookEndpoint> {
    return this.prisma.webhookEndpoint.update({ where: { id }, data: data as any }) as Promise<IWebhookEndpoint>;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.webhookEndpoint.delete({ where: { id } });
  }

  // ── History ──────────────────────────────────────────────────────

  async createHistory(data: Partial<IWebhookHistory>): Promise<IWebhookHistory> {
    return this.prisma.webhookHistory.create({ data: data as any }) as Promise<IWebhookHistory>;
  }

  async findHistory(endpointId: string): Promise<IWebhookHistory[]> {
    return this.prisma.webhookHistory.findMany({ where: { endpointId }, orderBy: { createdAt: 'asc' } }) as Promise<IWebhookHistory[]>;
  }

  // ── Deliveries ───────────────────────────────────────────────────

  async createDelivery(data: Partial<IWebhookDelivery>): Promise<IWebhookDelivery> {
    return this.prisma.webhookDelivery.create({ data: data as any }) as Promise<IWebhookDelivery>;
  }

  async findDeliveryById(id: string): Promise<IWebhookDelivery | null> {
    return this.prisma.webhookDelivery.findFirst({ where: { id } }) as Promise<IWebhookDelivery | null>;
  }

  async findDeliveryByIdempotencyKey(endpointId: string, idempotencyKey: string): Promise<IWebhookDelivery | null> {
    return this.prisma.webhookDelivery.findFirst({ where: { endpointId, idempotencyKey } }) as Promise<IWebhookDelivery | null>;
  }

  async updateDelivery(id: string, data: Partial<IWebhookDelivery>): Promise<IWebhookDelivery> {
    return this.prisma.webhookDelivery.update({ where: { id }, data: data as any }) as Promise<IWebhookDelivery>;
  }

  async findDeliveriesForEndpoint(endpointId: string, filter: DeliveryFilterDto): Promise<[IWebhookDelivery[], number]> {
    const where: Record<string, unknown> = { endpointId };
    if (filter.status) where.status = filter.status;
    if (filter.eventType) where.eventType = filter.eventType;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.webhookDelivery.findMany({ where: where as any, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.webhookDelivery.count({ where: where as any }),
    ]);

    return [data as IWebhookDelivery[], total];
  }
}
