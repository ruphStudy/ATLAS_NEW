import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../database/base.repository';
import { PrismaService } from '../../../database/prisma.service';
import { SyncModule, SyncStatus } from '../interfaces';

@Injectable()
export class SyncMonitorRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findActiveJobs(workspaceId: string, module?: SyncModule) {
    const where: any = {
      workspaceId,
      status: { in: ['QUEUED', 'RUNNING', 'PAUSED'] },
    };

    if (module) {
      where.module = module;
    }

    return this.findMany('MarketplaceSyncJob', where);
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

    return this.findMany('MarketplaceSyncJob', where);
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

    return this.findMany('MarketplaceSyncJob', where);
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

    return this.findMany('MarketplaceSyncJob', where, {
      orderBy: { startedAt: 'desc' },
    });
  }

  async findJob(workspaceId: string, jobId: string) {
    return this.findUnique('MarketplaceSyncJob', {
      id: jobId,
      workspaceId,
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

    const jobs = await this.findMany('MarketplaceSyncJob', where, {
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

    return this.findMany('MarketplaceSyncJob', where, {
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  async findStuckJobs(workspaceId: string, thresholdMinutes: number = 60) {
    const thresholdDate = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    return this.findMany('MarketplaceSyncJob', {
      workspaceId,
      status: 'RUNNING',
      startedAt: { lte: thresholdDate },
    });
  }

  async findRepeatedlyFailingJobs(
    workspaceId: string,
    minConsecutiveFailures: number = 3,
  ) {
    return this.findMany('MarketplaceSyncJob', {
      workspaceId,
      consecutiveFailures: { gte: minConsecutiveFailures },
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

    return this.count('MarketplaceSyncJob', where);
  }

  async findItemFailures(workspaceId: string, jobId: string) {
    return this.findMany('MarketplaceSyncItemFailure', {
      workspaceId,
      jobId,
    });
  }

  async findUnresolvedItemFailures(workspaceId: string, module: SyncModule) {
    return this.findMany('MarketplaceSyncItemFailure', {
      workspaceId,
      module,
      isResolved: false,
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
    return this.create('MarketplaceSyncIssue', {
      ...data,
      detectedAt: new Date(),
    });
  }

  async resolveIssue(workspaceId: string, issueId: string) {
    return this.update(
      'MarketplaceSyncIssue',
      { id: issueId, workspaceId },
      { resolvedAt: new Date() },
    );
  }

  async findActiveIssues(workspaceId: string, module?: SyncModule) {
    const where: any = {
      workspaceId,
      resolvedAt: null,
    };

    if (module) {
      where.module = module;
    }

    return this.findMany('MarketplaceSyncIssue', where, {
      orderBy: { detectedAt: 'desc' },
    });
  }

  async findScheduledSyncs(workspaceId: string) {
    return this.findMany('MarketplaceSyncSchedule', {
      workspaceId,
      isActive: true,
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

    const schedules = await this.findMany('MarketplaceSyncSchedule', where, {
      orderBy: { nextRunAt: 'asc' },
      take: 1,
    });

    return schedules[0] || null;
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
