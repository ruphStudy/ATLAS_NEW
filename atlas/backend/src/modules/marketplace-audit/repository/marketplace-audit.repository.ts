import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../database/base.repository';
import { PrismaService } from '../../../database/prisma.service';
import {
  ActivityModule,
  ActivityAction,
  ActivityStatus,
  ActorType,
  EntityType,
  IActivitySearchCriteria,
} from '../interfaces';

interface IAuditActivityRecord {
  module?: string;
  action?: string;
  status?: string;
  entityType?: string;
  entityId: string;
  actor?: { type?: string; id?: string };
}

@Injectable()
export class MarketplaceAuditRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private model(name: string) {
    return (this.prisma as unknown as Record<string, unknown>)[name] as Record<string, unknown>;
  }

  private call<T>(model: string, method: string, args: unknown): Promise<T> {
    const m = this.model(model);
    return (m[method] as (a: unknown) => Promise<T>)(args);
  }

  async createActivity(data: {
    workspaceId: string;
    provider: string;
    accountId?: string;
    module: ActivityModule;
    action: ActivityAction;
    status: ActivityStatus;
    entityType: EntityType;
    entityId: string;
    entityName?: string;
    actor: Record<string, any>;
    changeReference?: Record<string, any>;
    metadata?: Record<string, any>;
    correlationId?: string;
    requestId?: string;
    jobId?: string;
    externalId?: string;
    duration?: number;
    errorCode?: string;
    errorMessage?: string;
  }) {
    return this.call<Record<string, unknown>>('marketplaceAuditActivity', 'create', {
      data: {
        ...data,
        timestamp: new Date(),
      },
    });
  }

  async findActivity(id: string, workspaceId: string) {
    return this.call<Record<string, unknown> | null>('marketplaceAuditActivity', 'findFirst', {
      where: {
        id,
        workspaceId,
      },
    });
  }

  async searchActivities(criteria: IActivitySearchCriteria) {
    const where: any = {
      workspaceId: criteria.workspaceId,
    };

    if (criteria.provider) {
      where.provider = criteria.provider;
    }

    if (criteria.accountId) {
      where.accountId = criteria.accountId;
    }

    if (criteria.module) {
      where.module = criteria.module;
    }

    if (criteria.action) {
      where.action = criteria.action;
    }

    if (criteria.status) {
      where.status = criteria.status;
    }

    if (criteria.entityType) {
      where.entityType = criteria.entityType;
    }

    if (criteria.entityId) {
      where.entityId = criteria.entityId;
    }

    if (criteria.correlationId) {
      where.correlationId = criteria.correlationId;
    }

    if (criteria.requestId) {
      where.requestId = criteria.requestId;
    }

    if (criteria.startDate || criteria.endDate) {
      where.timestamp = {};
      if (criteria.startDate) {
        where.timestamp.gte = criteria.startDate;
      }
      if (criteria.endDate) {
        where.timestamp.lte = criteria.endDate;
      }
    }

    const options: any = {
      orderBy: {
        [criteria.sortBy || 'timestamp']: criteria.sortOrder || 'desc',
      },
    };

    if (criteria.limit) {
      options.take = criteria.limit;
    }

    if (criteria.offset) {
      options.skip = criteria.offset;
    }

    return this.call<Record<string, unknown>[]>('marketplaceAuditActivity', 'findMany', {
      where,
      ...options,
    });
  }

  async countActivities(criteria: IActivitySearchCriteria) {
    const where: any = {
      workspaceId: criteria.workspaceId,
    };

    if (criteria.provider) {
      where.provider = criteria.provider;
    }

    if (criteria.module) {
      where.module = criteria.module;
    }

    if (criteria.action) {
      where.action = criteria.action;
    }

    if (criteria.status) {
      where.status = criteria.status;
    }

    if (criteria.entityType) {
      where.entityType = criteria.entityType;
    }

    if (criteria.entityId) {
      where.entityId = criteria.entityId;
    }

    if (criteria.startDate || criteria.endDate) {
      where.timestamp = {};
      if (criteria.startDate) {
        where.timestamp.gte = criteria.startDate;
      }
      if (criteria.endDate) {
        where.timestamp.lte = criteria.endDate;
      }
    }

    return this.call<number>('marketplaceAuditActivity', 'count', { where });
  }

  async findEntityHistory(
    workspaceId: string,
    entityType: EntityType,
    entityId: string,
    limit?: number,
  ) {
    return this.call<Record<string, unknown>[]>('marketplaceAuditActivity', 'findMany', {
      where: {
        workspaceId,
        entityType,
        entityId,
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async findByCorrelationId(workspaceId: string, correlationId: string) {
    return this.call<Record<string, unknown>[]>('marketplaceAuditActivity', 'findMany', {
      where: {
        workspaceId,
        correlationId,
      },
      orderBy: { timestamp: 'asc' },
    });
  }

  async findRecentActivitiesByActor(
    workspaceId: string,
    actorType: ActorType,
    actorId: string,
    minutes: number,
  ) {
    const since = new Date(Date.now() - minutes * 60 * 1000);

    const activities = await this.call<IAuditActivityRecord[]>('marketplaceAuditActivity', 'findMany', {
      where: {
        workspaceId,
        timestamp: { gte: since },
      },
    });

    return activities.filter(
      (activity) =>
        activity.actor?.type === actorType && activity.actor?.id === actorId,
    );
  }

  async findFailuresByEntity(
    workspaceId: string,
    entityType: EntityType,
    entityId: string,
    minutes: number,
  ) {
    const since = new Date(Date.now() - minutes * 60 * 1000);

    return this.call<Record<string, unknown>[]>('marketplaceAuditActivity', 'findMany', {
      where: {
        workspaceId,
        entityType,
        entityId,
        status: ActivityStatus.FAILURE,
        timestamp: { gte: since },
      },
    });
  }

  async createSuspiciousActivity(data: {
    activityId: string;
    workspaceId: string;
    reason: string;
    severity: string;
  }) {
    return this.call<Record<string, unknown>>('marketplaceSuspiciousActivity', 'create', {
      data: {
        ...data,
        detectedAt: new Date(),
        isResolved: false,
      },
    });
  }

  async findSuspiciousActivities(workspaceId: string, isResolved?: boolean) {
    const where: any = {
      workspaceId,
    };

    if (isResolved !== undefined) {
      where.isResolved = isResolved;
    }

    return this.call<Record<string, unknown>[]>('marketplaceSuspiciousActivity', 'findMany', {
      where,
      orderBy: { detectedAt: 'desc' },
    });
  }

  async resolveSuspiciousActivity(id: string, workspaceId: string) {
    return this.call<Record<string, unknown>>('marketplaceSuspiciousActivity', 'update', {
      where: { id, workspaceId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
    });
  }

  async createRetentionPolicy(data: {
    workspaceId: string;
    module?: ActivityModule;
    retentionDays: number;
    archiveBeforeDelete: boolean;
    enabled: boolean;
  }) {
    return this.call<Record<string, unknown>>('marketplaceAuditRetentionPolicy', 'create', { data });
  }

  async findRetentionPolicies(workspaceId: string) {
    return this.call<Record<string, unknown>[]>('marketplaceAuditRetentionPolicy', 'findMany', {
      where: {
        workspaceId,
        enabled: true,
      },
    });
  }

  async deleteActivitiesOlderThan(
    workspaceId: string,
    date: Date,
    module?: ActivityModule,
  ) {
    const where: any = {
      workspaceId,
      timestamp: { lte: date },
    };

    if (module) {
      where.module = module;
    }

    return this.call<{ count: number }>('marketplaceAuditActivity', 'deleteMany', { where });
  }

  async aggregateByModule(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const activities = await this.call<IAuditActivityRecord[]>('marketplaceAuditActivity', 'findMany', {
      where: {
        workspaceId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const moduleMap = new Map<ActivityModule, number>();

    for (const activity of activities) {
      const module = activity.module as ActivityModule;
      moduleMap.set(module, (moduleMap.get(module) || 0) + 1);
    }

    return Object.fromEntries(moduleMap);
  }

  async aggregateByAction(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const activities = await this.call<IAuditActivityRecord[]>('marketplaceAuditActivity', 'findMany', {
      where: {
        workspaceId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const actionMap = new Map<ActivityAction, number>();

    for (const activity of activities) {
      const action = activity.action as ActivityAction;
      actionMap.set(action, (actionMap.get(action) || 0) + 1);
    }

    return Object.fromEntries(actionMap);
  }

  async aggregateByStatus(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const activities = await this.call<IAuditActivityRecord[]>('marketplaceAuditActivity', 'findMany', {
      where: {
        workspaceId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const statusMap = new Map<ActivityStatus, number>();

    for (const activity of activities) {
      const status = activity.status as ActivityStatus;
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    }

    return Object.fromEntries(statusMap);
  }

  async aggregateByActor(workspaceId: string, startDate: Date, endDate: Date) {
    const activities = await this.call<IAuditActivityRecord[]>('marketplaceAuditActivity', 'findMany', {
      where: {
        workspaceId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const actorMap = new Map<ActorType, number>();

    for (const activity of activities) {
      const actorType = activity.actor?.type as ActorType;
      if (actorType) {
        actorMap.set(actorType, (actorMap.get(actorType) || 0) + 1);
      }
    }

    return Object.fromEntries(actorMap);
  }

  async findTopEntities(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 10,
  ) {
    const activities = await this.call<IAuditActivityRecord[]>('marketplaceAuditActivity', 'findMany', {
      where: {
        workspaceId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const entityMap = new Map<
      string,
      { entityType: EntityType; entityId: string; count: number }
    >();

    for (const activity of activities) {
      const key = `${activity.entityType}:${activity.entityId}`;
      if (!entityMap.has(key)) {
        entityMap.set(key, {
          entityType: activity.entityType as EntityType,
          entityId: activity.entityId,
          count: 0,
        });
      }
      entityMap.get(key)!.count++;
    }

    return Array.from(entityMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((item) => ({
        entityType: item.entityType,
        entityId: item.entityId,
        activityCount: item.count,
      }));
  }
}
