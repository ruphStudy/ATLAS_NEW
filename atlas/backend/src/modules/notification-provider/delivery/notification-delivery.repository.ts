import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { INotificationDelivery } from '../interfaces';
import { DeliveryFilterDto } from '../dto';

@Injectable()
export class NotificationDeliveryRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(data: Partial<INotificationDelivery>): Promise<INotificationDelivery> {
    return this.prisma.notificationDelivery.create({
      data: data as any,
    }) as Promise<INotificationDelivery>;
  }

  async update(
    id: string,
    data: Partial<INotificationDelivery>,
  ): Promise<INotificationDelivery> {
    return this.prisma.notificationDelivery.update({
      where: { id },
      data: data as any,
    }) as Promise<INotificationDelivery>;
  }

  async findById(id: string, workspaceId: string): Promise<INotificationDelivery | null> {
    return this.prisma.notificationDelivery.findFirst({
      where: { id, workspaceId },
    }) as Promise<INotificationDelivery | null>;
  }

  /** Used by inbound delivery-receipt/status-callback webhooks to locate the original send by the vendor's message id. */
  async findByProviderRef(
    workspaceId: string,
    providerRef: string,
  ): Promise<INotificationDelivery | null> {
    return this.prisma.notificationDelivery.findFirst({
      where: { workspaceId, providerRef },
      orderBy: { createdAt: 'desc' },
    }) as Promise<INotificationDelivery | null>;
  }

  async findByIdempotency(
    workspaceId: string,
    idempotencyKey: string,
    recipientAddress: string,
  ): Promise<INotificationDelivery | null> {
    return this.prisma.notificationDelivery.findFirst({
      where: { workspaceId, idempotencyKey, recipientAddress },
    }) as Promise<INotificationDelivery | null>;
  }

  async findAll(
    filter: DeliveryFilterDto,
  ): Promise<[INotificationDelivery[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId: filter.workspaceId };
    if (filter.channel) where.channel = filter.channel;
    if (filter.providerKey) where.providerKey = filter.providerKey;
    if (filter.status) where.status = filter.status;
    if (filter.batchId) where.batchId = filter.batchId;
    if (filter.notificationId) where.notificationId = filter.notificationId;

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = new Date(filter.startDate);
      if (filter.endDate) where.createdAt.lte = new Date(filter.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.notificationDelivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notificationDelivery.count({ where }),
    ]);

    return [data as INotificationDelivery[], total];
  }

  async findDueScheduled(
    workspaceId: string,
    at: Date = new Date(),
  ): Promise<INotificationDelivery[]> {
    return this.prisma.notificationDelivery.findMany({
      where: {
        workspaceId,
        status: { in: ['PENDING', 'QUEUED'] },
        scheduledAt: { lte: at },
      },
    }) as Promise<INotificationDelivery[]>;
  }
}
