import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../database/base.repository';
import { PrismaService } from '../../../database/prisma.service';
import { SyncModule, SyncStatus } from '../interfaces';

interface ISyncItemFailureRecord {
  itemId: string;
  errorCode: string | null;
  errorMessage: string;
  failedAt: Date;
}

@Injectable()
export class SyncMonitorRepository extends BaseRepository {
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

  async findActiveJobs(workspaceId: string, module?: SyncModule) {
    const where: any = {
      workspaceId,
      status: { in: ['QUEUED', 'RUNNING', 'PAUSED'] },
    };

    if (module) {
      where.module = module;
    }

    return this.call<Record<string, unknown>[]>('marketplaceSyncJob', 'findMany', { where });
  }

  async findJobsByStatus(
    workspaceId: string,
    status: SyncStatus | SyncStatus[],
    module?: SyncModule,
  ) {
    const where: any = {
      workspaceId,
      status: Array.isArray(status) ? { in: status } : status,
    };

    if (module) {
      where.module = module;
    }

    return this.call<Record<string, unknown>[]>('marketplaceSyncJob', 'findMany', { where });
  }

  async findJobsByProvider(
    workspaceId: string,
    provider: string,
    accountId?: string,
  ) {
    const where: any = {
      workspaceId,
      provider,
    };

    if (accountId) {
      where.accountId = accountId;
    }

    return this.call<Record<string, unknown>[]>('marketplaceSyncJob', 'findMany', { where });
  }

  async findJobsByDateRange(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    module?: SyncModule,
  ) {
    const where: any = {
      workspaceId,
      startedAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (module) {
      where.module = module;
    }

    return this.call<Record<string, unknown>[]>('marketplaceSyncJob', 'findMany', {
      where,
      orderBy: { startedAt: 'desc' },
    });
  }

  async findJob(workspaceId: string, jobId: string) {
    return this.call<Record<string, unknown> | null>('marketplaceSyncJob', 'findFirst', {
      where: {
        id: jobId,
        workspaceId,
      },
    });
  }

  async updateJob(jobId: string, workspaceId: string, data: Record<string, unknown>) {
    return this.call<Record<string, unknown>>('marketplaceSyncJob', 'update', {
      where: { id: jobId, workspaceId },
      data,
    });
  }

  async findLastSuccessfulSync(
    workspaceId: string,
    module: SyncModule,
    provider: string,
    accountId?: string,
  ) {
    const where: any = {
      workspaceId,
      module,
      provider,
      status: 'COMPLETED',
    };

    if (accountId) {
      where.accountId = accountId;
    }

    const jobs = await this.call<Record<string, unknown>[]>('marketplaceSyncJob', 'findMany', {
      where,
      orderBy: { completedAt: 'desc' },
      take: 1,
    });

    return jobs[0] || null;
  }

  async findRecentHistory(
    workspaceId: string,
    module: SyncModule,
    provider: string,
    accountId?: string,
    limit: number = 10,
  ) {
    const where: any = {
      workspaceId,
      module,
      provider,
      status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] },
    };

    if (accountId) {
      where.accountId = accountId;
    }

    return this.call<Record<string, unknown>[]>('marketplaceSyncJob', 'findMany', {
      where,
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  async findStuckJobs(workspaceId: string, thresholdMinutes: number = 60) {
    const thresholdDate = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    return this.call<Record<string, unknown>[]>('marketplaceSyncJob', 'findMany', {
      where: {
        workspaceId,
        status: 'RUNNING',
        startedAt: { lte: thresholdDate },
      },
    });
  }

  async findRepeatedlyFailingJobs(
    workspaceId: string,
    minConsecutiveFailures: number = 3,
  ) {
    return this.call<Record<string, unknown>[]>('marketplaceSyncJob', 'findMany', {
      where: {
        workspaceId,
        consecutiveFailures: { gte: minConsecutiveFailures },
      },
    });
  }

  async countJobsByStatus(
    workspaceId: string,
    status: SyncStatus,
    module?: SyncModule,
  ) {
    const where: any = {
      workspaceId,
      status,
    };

    if (module) {
      where.module = module;
    }

    return this.call<number>('marketplaceSyncJob', 'count', { where });
  }

  async findItemFailures(workspaceId: string, jobId: string) {
    return this.call<ISyncItemFailureRecord[]>('marketplaceSyncItemFailure', 'findMany', {
      where: {
        workspaceId,
        jobId,
      },
    });
  }

  async findUnresolvedItemFailures(workspaceId: string, module: SyncModule) {
    return this.call<Record<string, unknown>[]>('marketplaceSyncItemFailure', 'findMany', {
      where: {
        workspaceId,
        module,
        isResolved: false,
      },
    });
  }

  async createIssue(data: {
    workspaceId: string;
    module: SyncModule;
    provider: string;
    accountId?: string;
    type: string;
    severity: string;
    message: string;
    metadata?: Record<string, any>;
  }) {
    return this.call<Record<string, unknown>>('marketplaceSyncIssue', 'create', {
      data: {
        ...data,
        detectedAt: new Date(),
      },
    });
  }

  async resolveIssue(workspaceId: string, issueId: string) {
    return this.call<Record<string, unknown>>('marketplaceSyncIssue', 'update', {
      where: { id: issueId, workspaceId },
      data: { resolvedAt: new Date() },
    });
  }

  async findActiveIssues(workspaceId: string, module?: SyncModule) {
    const where: any = {
      workspaceId,
      resolvedAt: null,
    };

    if (module) {
      where.module = module;
    }

    return this.call<Record<string, unknown>[]>('marketplaceSyncIssue', 'findMany', {
      where,
      orderBy: { detectedAt: 'desc' },
    });
  }

  async findScheduledSyncs(workspaceId: string) {
    return this.call<Record<string, unknown>[]>('marketplaceSyncSchedule', 'findMany', {
      where: {
        workspaceId,
        isActive: true,
      },
    });
  }

  async findNextScheduledSync(
    workspaceId: string,
    module: SyncModule,
    provider: string,
    accountId?: string,
  ) {
    const where: any = {
      workspaceId,
      module,
      provider,
      isActive: true,
    };

    if (accountId) {
      where.accountId = accountId;
    }

    const schedules = await this.call<Record<string, unknown>[]>('marketplaceSyncSchedule', 'findMany', {
      where,
      orderBy: { nextRunAt: 'asc' },
      take: 1,
    });

    return schedules[0] || null;
  }

  async findRateLimitRecord(
    workspaceId: string,
    module: SyncModule,
    provider: string,
    accountId: string,
  ) {
    return this.call<Record<string, unknown> | null>('marketplaceRateLimit', 'findFirst', {
      where: { workspaceId, module, provider, accountId },
    });
  }

  async aggregateErrorsByCode(workspaceId: string, jobId: string) {
    const failures = await this.findItemFailures(workspaceId, jobId);

    const errorMap = new Map<
      string,
      {
        code: string;
        message: string;
        count: number;
        items: string[];
        firstOccurrence: Date;
        lastOccurrence: Date;
      }
    >();

    for (const failure of failures) {
      const key = failure.errorCode || 'UNKNOWN';
      if (!errorMap.has(key)) {
        errorMap.set(key, {
          code: key,
          message: failure.errorMessage,
          count: 0,
          items: [],
          firstOccurrence: failure.failedAt,
          lastOccurrence: failure.failedAt,
        });
      }

      const entry = errorMap.get(key)!;
      entry.count++;
      entry.items.push(failure.itemId);
      if (failure.failedAt < entry.firstOccurrence) {
        entry.firstOccurrence = failure.failedAt;
      }
      if (failure.failedAt > entry.lastOccurrence) {
        entry.lastOccurrence = failure.failedAt;
      }
    }

    return Array.from(errorMap.values());
  }
}
