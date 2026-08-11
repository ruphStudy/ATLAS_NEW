import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { ItemSyncStatus, SyncMode, SyncStatus, ReportType, ReportStatus } from '../interfaces';

@Injectable()
export class ReportSyncRepository extends BaseRepository {
  private readonly jobModel = 'MarketplaceReportSyncJob';
  private readonly scheduleModel = 'MarketplaceReportSyncSchedule';
  private readonly itemResultModel = 'MarketplaceReportSyncItemResult';
  private readonly externalRefModel = 'ExternalReportRef';
  private readonly reportDocumentModel = 'MarketplaceReportDocument';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createJob(data: {
    workspaceId: string;
    accountId: string;
    providerKey: string;
    marketplaceKey: string;
    reportType: ReportType;
    mode: SyncMode;
    startDate?: Date;
    endDate?: Date;
    metadata?: Record<string, any>;
  }) {
    return (this.prisma as any)[this.jobModel].create({
      data: {
        ...data,
        status: SyncStatus.PENDING,
        totalReports: 0,
        processedReports: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
      },
    });
  }

  async updateJob(id: string, workspaceId: string, data: Partial<any>) {
    return (this.prisma as any)[this.jobModel].update({
      where: { id_workspaceId: { id, workspaceId } },
      data,
    });
  }

  async getJob(id: string, workspaceId: string) {
    return (this.prisma as any)[this.jobModel].findUnique({
      where: { id_workspaceId: { id, workspaceId } },
    });
  }

  async findJobs(filter: {
    workspaceId: string;
    accountId?: string;
    reportType?: ReportType;
    status?: SyncStatus;
    mode?: SyncMode;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20, workspaceId, ...where } = filter;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      (this.prisma as any)[this.jobModel].findMany({
        where: { workspaceId, ...where },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any)[this.jobModel].count({
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

  async createSchedule(data: {
    workspaceId: string;
    accountId: string;
    providerKey: string;
    marketplaceKey: string;
    reportType: ReportType;
    mode: SyncMode;
    cronExpression: string;
    isActive: boolean;
    metadata?: Record<string, any>;
  }) {
    return (this.prisma as any)[this.scheduleModel].create({ data });
  }

  async updateSchedule(id: string, workspaceId: string, data: Partial<any>) {
    return (this.prisma as any)[this.scheduleModel].update({
      where: { id_workspaceId: { id, workspaceId } },
      data,
    });
  }

  async deleteSchedule(id: string, workspaceId: string) {
    return (this.prisma as any)[this.scheduleModel].delete({
      where: { id_workspaceId: { id, workspaceId } },
    });
  }

  async getSchedules(workspaceId: string, accountId?: string) {
    return (this.prisma as any)[this.scheduleModel].findMany({
      where: { workspaceId, ...(accountId && { accountId }) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createItemResult(data: {
    jobId: string;
    workspaceId: string;
    externalReportId: string;
    reportType: ReportType;
    status: ItemSyncStatus;
    operation?: string;
    recordsImported?: number;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }) {
    return (this.prisma as any)[this.itemResultModel].create({ data });
  }

  async updateItemResult(id: string, workspaceId: string, data: Partial<any>) {
    return (this.prisma as any)[this.itemResultModel].update({
      where: { id_workspaceId: { id, workspaceId } },
      data,
    });
  }

  async getItemResults(jobId: string, workspaceId: string, filter?: {
    status?: ItemSyncStatus;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, status } = filter || {};
    const skip = (page - 1) * limit;

    const where = { jobId, workspaceId, ...(status && { status }) };

    const [items, total] = await Promise.all([
      (this.prisma as any)[this.itemResultModel].findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any)[this.itemResultModel].count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async upsertExternalRef(data: {
    workspaceId: string;
    accountId: string;
    externalReportId: string;
    externalRequestId?: string;
    reportType: ReportType;
    status: ReportStatus;
    requestedAt?: Date;
    generatedAt?: Date;
    downloadedAt?: Date;
    importedAt?: Date;
    availableUntil?: Date;
    lastSyncedAt: Date;
    checksum?: string;
    metadata?: Record<string, any>;
  }) {
    return (this.prisma as any)[this.externalRefModel].upsert({
      where: {
        workspaceId_accountId_externalReportId: {
          workspaceId: data.workspaceId,
          accountId: data.accountId,
          externalReportId: data.externalReportId,
        },
      },
      create: data,
      update: data,
    });
  }

  async getExternalRef(workspaceId: string, accountId: string, externalReportId: string) {
    return (this.prisma as any)[this.externalRefModel].findUnique({
      where: {
        workspaceId_accountId_externalReportId: {
          workspaceId,
          accountId,
          externalReportId,
        },
      },
    });
  }

  async getExternalRefs(workspaceId: string, accountId: string, filter?: {
    reportType?: ReportType;
    status?: ReportStatus;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, ...where } = filter || {};
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      (this.prisma as any)[this.externalRefModel].findMany({
        where: { workspaceId, accountId, ...where },
        skip,
        take: limit,
        orderBy: { lastSyncedAt: 'desc' },
      }),
      (this.prisma as any)[this.externalRefModel].count({
        where: { workspaceId, accountId, ...where },
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

  async createReportDocument(data: {
    workspaceId: string;
    accountId: string;
    externalReportId: string;
    reportType: ReportType;
    format: string;
    filePath: string;
    fileSize: number;
    checksum: string;
    recordCount?: number;
    startDate?: Date;
    endDate?: Date;
    metadata?: Record<string, any>;
  }) {
    return (this.prisma as any)[this.reportDocumentModel].create({ data });
  }

  async getReportDocument(workspaceId: string, externalReportId: string) {
    return (this.prisma as any)[this.reportDocumentModel].findFirst({
      where: { workspaceId, externalReportId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReportDocuments(workspaceId: string, accountId: string, filter?: {
    reportType?: ReportType;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, ...where } = filter || {};
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      (this.prisma as any)[this.reportDocumentModel].findMany({
        where: { workspaceId, accountId, ...where },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any)[this.reportDocumentModel].count({
        where: { workspaceId, accountId, ...where },
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

  async getMetrics(workspaceId: string, accountId?: string) {
    const where = { workspaceId, ...(accountId && { accountId }) };

    const [
      totalJobs,
      completedJobs,
      failedJobs,
      activeJobs,
      totalReportsProcessed,
      totalReportsImported,
    ] = await Promise.all([
      (this.prisma as any)[this.jobModel].count({ where }),
      (this.prisma as any)[this.jobModel].count({
        where: { ...where, status: SyncStatus.COMPLETED },
      }),
      (this.prisma as any)[this.jobModel].count({
        where: { ...where, status: SyncStatus.FAILED },
      }),
      (this.prisma as any)[this.jobModel].count({
        where: { ...where, status: SyncStatus.RUNNING },
      }),
      (this.prisma as any)[this.jobModel].aggregate({
        where,
        _sum: { processedReports: true },
      }),
      (this.prisma as any)[this.externalRefModel].count({
        where: { ...where, status: ReportStatus.IMPORTED },
      }),
    ]);

    return {
      totalJobs,
      completedJobs,
      failedJobs,
      activeJobs,
      totalReportsProcessed: totalReportsProcessed._sum.processedReports || 0,
      totalReportsImported,
    };
  }
}
