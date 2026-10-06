import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { WebhookStatus, WebhookEvent, WebhookDeliveryStatus } from '../interfaces';

@Injectable()
export class WebhookRepository extends BaseRepository {
  private readonly configModel = 'MarketplaceWebhookConfig';
  private readonly deliveryModel = 'MarketplaceWebhookDelivery';
  private readonly secretModel = 'MarketplaceWebhookSecret';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createConfig(data: {
    workspaceId: string;
    accountId: string;
    providerKey: string;
    marketplaceKey: string;
    externalWebhookId?: string;
    callbackUrl: string;
    events: WebhookEvent[];
    status: WebhookStatus;
    secret?: string;
    isActive: boolean;
    metadata?: Record<string, any>;
  }) {
    return (this.prisma as any)[this.configModel].create({
      data: {
        ...data,
        failureCount: 0,
      },
    });
  }

  async updateConfig(id: string, workspaceId: string, data: Partial<any>) {
    return (this.prisma as any)[this.configModel].update({
      where: { id_workspaceId: { id, workspaceId } },
      data,
    });
  }

  async getConfig(id: string, workspaceId: string) {
    return (this.prisma as any)[this.configModel].findUnique({
      where: { id_workspaceId: { id, workspaceId } },
    });
  }

  async getConfigByExternalId(workspaceId: string, accountId: string, externalWebhookId: string) {
    return (this.prisma as any)[this.configModel].findFirst({
      where: { workspaceId, accountId, externalWebhookId },
    });
  }

  async findConfigs(filter: {
    workspaceId: string;
    accountId?: string;
    providerKey?: string;
    status?: WebhookStatus;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20, workspaceId, ...where } = filter;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      (this.prisma as any)[this.configModel].findMany({
        where: { workspaceId, ...where },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any)[this.configModel].count({
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

  async deleteConfig(id: string, workspaceId: string) {
    return (this.prisma as any)[this.configModel].delete({
      where: { id_workspaceId: { id, workspaceId } },
    });
  }

  async createDelivery(data: {
    workspaceId: string;
    accountId: string;
    webhookConfigId: string;
    externalEventId: string;
    event: WebhookEvent;
    status: WebhookDeliveryStatus;
    receivedAt: Date;
    attemptCount: number;
    payload: Record<string, any>;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }) {
    return (this.prisma as any)[this.deliveryModel].create({ data });
  }

  async updateDelivery(id: string, workspaceId: string, data: Partial<any>) {
    return (this.prisma as any)[this.deliveryModel].update({
      where: { id_workspaceId: { id, workspaceId } },
      data,
    });
  }

  async getDelivery(id: string, workspaceId: string) {
    return (this.prisma as any)[this.deliveryModel].findUnique({
      where: { id_workspaceId: { id, workspaceId } },
    });
  }

  async getDeliveryByEventId(workspaceId: string, accountId: string, externalEventId: string) {
    return (this.prisma as any)[this.deliveryModel].findFirst({
      where: { workspaceId, accountId, externalEventId },
    });
  }

  async findDeliveries(filter: {
    workspaceId: string;
    accountId?: string;
    webhookConfigId?: string;
    event?: WebhookEvent;
    status?: WebhookDeliveryStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, workspaceId, ...where } = filter;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      (this.prisma as any)[this.deliveryModel].findMany({
        where: { workspaceId, ...where },
        skip,
        take: limit,
        orderBy: { receivedAt: 'desc' },
      }),
      (this.prisma as any)[this.deliveryModel].count({
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

  async storeSecret(data: {
    workspaceId: string;
    webhookConfigId: string;
    secret: string;
    isActive: boolean;
    expiresAt?: Date;
  }) {
    return (this.prisma as any)[this.secretModel].create({ data });
  }

  async getActiveSecret(workspaceId: string, webhookConfigId: string) {
    return (this.prisma as any)[this.secretModel].findFirst({
      where: { workspaceId, webhookConfigId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deactivateSecrets(workspaceId: string, webhookConfigId: string) {
    return (this.prisma as any)[this.secretModel].updateMany({
      where: { workspaceId, webhookConfigId, isActive: true },
      data: { isActive: false },
    });
  }

  async getMetrics(workspaceId: string, accountId?: string) {
    const where = { workspaceId, ...(accountId && { accountId }) };

    const [
      totalWebhooks,
      activeWebhooks,
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
    ] = await Promise.all([
      (this.prisma as any)[this.configModel].count({ where }),
      (this.prisma as any)[this.configModel].count({
        where: { ...where, isActive: true, status: WebhookStatus.ACTIVE },
      }),
      (this.prisma as any)[this.deliveryModel].count({ where }),
      (this.prisma as any)[this.deliveryModel].count({
        where: { ...where, status: WebhookDeliveryStatus.SUCCESS },
      }),
      (this.prisma as any)[this.deliveryModel].count({
        where: { ...where, status: WebhookDeliveryStatus.FAILED },
      }),
    ]);

    return {
      totalWebhooks,
      activeWebhooks,
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      successRate: totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0,
    };
  }
}
