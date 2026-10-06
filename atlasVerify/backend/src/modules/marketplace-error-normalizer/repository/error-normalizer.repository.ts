import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../database/base.repository';
import { PrismaService } from '../../../database/prisma.service';
import {
  UniversalErrorCode,
  ErrorCategory,
  ErrorSeverity,
  ErrorSearchCriteria,
} from '../interfaces';

@Injectable()
export class ErrorNormalizerRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findErrorHistory(
    workspaceId: string,
    provider: string,
    errorCode: UniversalErrorCode,
    providerCode?: string,
  ) {
    const where: any = {
      workspaceId,
      provider,
      errorCode,
    };

    if (providerCode) {
      where.providerCode = providerCode;
    }

    const records = await this.findMany('MarketplaceErrorHistory', where, {
      orderBy: { lastOccurredAt: 'desc' },
      take: 1,
    });

    return records[0] || null;
  }

  async createErrorHistory(data: {
    workspaceId: string;
    provider: string;
    accountId?: string;
    module?: string;
    operation?: string;
    errorCode: UniversalErrorCode;
    errorCategory: ErrorCategory;
    errorSeverity: ErrorSeverity;
    errorMessage: string;
    providerCode?: string;
    providerMessage?: string;
    httpStatus?: number;
    requestId?: string;
    resourceId?: string;
    metadata?: Record<string, any>;
  }) {
    return this.create('MarketplaceErrorHistory', {
      ...data,
      occurrenceCount: 1,
      firstOccurredAt: new Date(),
      lastOccurredAt: new Date(),
      isResolved: false,
    });
  }

  async incrementErrorOccurrence(historyId: string, workspaceId: string) {
    const history = await this.findUnique('MarketplaceErrorHistory', {
      id: historyId,
      workspaceId,
    });

    if (!history) return null;

    return this.update(
      'MarketplaceErrorHistory',
      { id: historyId, workspaceId },
      {
        occurrenceCount: history.occurrenceCount + 1,
        lastOccurredAt: new Date(),
      },
    );
  }

  async createErrorOccurrence(data: {
    historyId: string;
    workspaceId: string;
    errorCode: UniversalErrorCode;
    context?: Record<string, any>;
  }) {
    return this.create('MarketplaceErrorOccurrence', {
      ...data,
      timestamp: new Date(),
    });
  }

  async searchErrors(criteria: ErrorSearchCriteria) {
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

    if (criteria.errorCode) {
      where.errorCode = criteria.errorCode;
    }

    if (criteria.category) {
      where.errorCategory = criteria.category;
    }

    if (criteria.severity) {
      where.errorSeverity = criteria.severity;
    }

    if (criteria.startDate || criteria.endDate) {
      where.lastOccurredAt = {};
      if (criteria.startDate) {
        where.lastOccurredAt.gte = criteria.startDate;
      }
      if (criteria.endDate) {
        where.lastOccurredAt.lte = criteria.endDate;
      }
    }

    if (criteria.isResolved !== undefined) {
      where.isResolved = criteria.isResolved;
    }

    const options: any = {
      orderBy: { lastOccurredAt: 'desc' },
    };

    if (criteria.limit) {
      options.take = criteria.limit;
    }

    if (criteria.offset) {
      options.skip = criteria.offset;
    }

    return this.findMany('MarketplaceErrorHistory', where, options);
  }

  async countErrors(criteria: ErrorSearchCriteria) {
    const where: any = {
      workspaceId: criteria.workspaceId,
    };

    if (criteria.provider) {
      where.provider = criteria.provider;
    }

    if (criteria.errorCode) {
      where.errorCode = criteria.errorCode;
    }

    if (criteria.category) {
      where.errorCategory = criteria.category;
    }

    if (criteria.isResolved !== undefined) {
      where.isResolved = criteria.isResolved;
    }

    return this.count('MarketplaceErrorHistory', where);
  }

  async findTopErrors(
    workspaceId: string,
    limit: number = 10,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: any = {
      workspaceId,
      isResolved: false,
    };

    if (startDate || endDate) {
      where.lastOccurredAt = {};
      if (startDate) {
        where.lastOccurredAt.gte = startDate;
      }
      if (endDate) {
        where.lastOccurredAt.lte = endDate;
      }
    }

    return this.findMany('MarketplaceErrorHistory', where, {
      orderBy: { occurrenceCount: 'desc' },
      take: limit,
    });
  }

  async resolveError(workspaceId: string, historyId: string) {
    return this.update(
      'MarketplaceErrorHistory',
      { id: historyId, workspaceId },
      {
        isResolved: true,
        resolvedAt: new Date(),
      },
    );
  }

  async findErrorOccurrences(
    workspaceId: string,
    historyId: string,
    limit: number = 100,
  ) {
    return this.findMany(
      'MarketplaceErrorOccurrence',
      {
        workspaceId,
        historyId,
      },
      {
        orderBy: { timestamp: 'desc' },
        take: limit,
      },
    );
  }

  async aggregateErrorsByCategory(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const errors = await this.findMany('MarketplaceErrorHistory', {
      workspaceId,
      lastOccurredAt: {
        gte: startDate,
        lte: endDate,
      },
    });

    const categoryMap = new Map<
      ErrorCategory,
      {
        category: ErrorCategory;
        count: number;
        occurrences: number;
      }
    >();

    for (const error of errors) {
      const category = error.errorCategory as ErrorCategory;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          count: 0,
          occurrences: 0,
        });
      }

      const entry = categoryMap.get(category)!;
      entry.count++;
      entry.occurrences += error.occurrenceCount;
    }

    return Array.from(categoryMap.values());
  }

  async aggregateErrorsBySeverity(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const errors = await this.findMany('MarketplaceErrorHistory', {
      workspaceId,
      lastOccurredAt: {
        gte: startDate,
        lte: endDate,
      },
    });

    const severityMap = new Map<
      ErrorSeverity,
      {
        severity: ErrorSeverity;
        count: number;
        occurrences: number;
      }
    >();

    for (const error of errors) {
      const severity = error.errorSeverity as ErrorSeverity;
      if (!severityMap.has(severity)) {
        severityMap.set(severity, {
          severity,
          count: 0,
          occurrences: 0,
        });
      }

      const entry = severityMap.get(severity)!;
      entry.count++;
      entry.occurrences += error.occurrenceCount;
    }

    return Array.from(severityMap.values());
  }
}
