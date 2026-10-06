import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  IFileRecord,
  IFileVersionRecord,
  IFileFolder,
  IFileAccessToken,
  IWorkspaceStorageQuota,
  FileStatus,
} from './interfaces';
import { FileFilterDto } from './dto';

/**
 * FileManagementRepository — the ONLY layer that touches `PrismaService` for
 * files, versions, folders, access tokens and workspace storage quotas.
 */
@Injectable()
export class FileManagementRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Files ────────────────────────────────────────────────────────

  async create(data: Partial<IFileRecord>): Promise<IFileRecord> {
    return this.prisma.fileRecord.create({ data: data as any }) as Promise<IFileRecord>;
  }

  async findById(id: string, workspaceId: string): Promise<IFileRecord | null> {
    return this.prisma.fileRecord.findFirst({
      where: { id, workspaceId, deletedAt: null },
    }) as Promise<IFileRecord | null>;
  }

  async findByChecksum(workspaceId: string, checksum: string): Promise<IFileRecord | null> {
    return this.prisma.fileRecord.findFirst({
      where: { workspaceId, checksum, deletedAt: null, status: { not: FileStatus.DELETED } },
      orderBy: { createdAt: 'desc' },
    }) as Promise<IFileRecord | null>;
  }

  async findAll(workspaceId: string, filter: FileFilterDto): Promise<[IFileRecord[], number]> {
    const where = this.buildWhere(filter, workspaceId);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.fileRecord.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.fileRecord.count({ where: where as any }),
    ]);

    return [data as IFileRecord[], total];
  }

  async update(id: string, workspaceId: string, data: Partial<IFileRecord>): Promise<IFileRecord> {
    return this.prisma.fileRecord.update({
      where: { id },
      data: data as any,
    }) as Promise<IFileRecord>;
  }

  async updateMany(ids: string[], workspaceId: string, data: Partial<IFileRecord>): Promise<number> {
    const result = await this.prisma.fileRecord.updateMany({
      where: { id: { in: ids }, workspaceId },
      data: data as any,
    });
    return result.count;
  }

  async aggregateUsedBytes(workspaceId: string): Promise<number> {
    const result = await this.prisma.fileRecord.aggregate({
      where: { workspaceId, deletedAt: null, status: { not: FileStatus.DELETED } },
      _sum: { sizeBytes: true },
    });
    return result._sum.sizeBytes ?? 0;
  }

  // ── Versions ─────────────────────────────────────────────────────

  async createVersion(data: Partial<IFileVersionRecord>): Promise<IFileVersionRecord> {
    return this.prisma.fileVersionRecord.create({
      data: data as any,
    }) as Promise<IFileVersionRecord>;
  }

  async listVersions(fileId: string, workspaceId: string, take: number): Promise<IFileVersionRecord[]> {
    return this.prisma.fileVersionRecord.findMany({
      where: { fileId, workspaceId },
      orderBy: { version: 'desc' },
      take,
    }) as Promise<IFileVersionRecord[]>;
  }

  // ── Folders ──────────────────────────────────────────────────────

  async createFolder(data: Partial<IFileFolder>): Promise<IFileFolder> {
    return this.prisma.fileFolder.create({ data: data as any }) as Promise<IFileFolder>;
  }

  async findFolderById(id: string, workspaceId: string): Promise<IFileFolder | null> {
    return this.prisma.fileFolder.findFirst({
      where: { id, workspaceId, deletedAt: null },
    }) as Promise<IFileFolder | null>;
  }

  async listFolders(workspaceId: string, parentFolderId?: string | null): Promise<IFileFolder[]> {
    return this.prisma.fileFolder.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        parentFolderId: parentFolderId === undefined ? undefined : parentFolderId,
      },
      orderBy: { name: 'asc' },
    }) as Promise<IFileFolder[]>;
  }

  async softDeleteFolder(id: string, workspaceId: string): Promise<void> {
    await this.prisma.fileFolder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Access tokens ────────────────────────────────────────────────

  async createAccessToken(data: Partial<IFileAccessToken>): Promise<IFileAccessToken> {
    return this.prisma.fileAccessToken.create({
      data: data as any,
    }) as Promise<IFileAccessToken>;
  }

  async findAccessTokenByToken(token: string): Promise<IFileAccessToken | null> {
    return this.prisma.fileAccessToken.findUnique({
      where: { token },
    }) as Promise<IFileAccessToken | null>;
  }

  async incrementAccessTokenUse(id: string): Promise<void> {
    await this.prisma.fileAccessToken.update({
      where: { id },
      data: { usedCount: { increment: 1 } },
    });
  }

  // ── Workspace storage quota ──────────────────────────────────────

  async findQuota(workspaceId: string): Promise<IWorkspaceStorageQuota | null> {
    return this.prisma.workspaceStorageQuota.findUnique({
      where: { workspaceId },
    }) as Promise<IWorkspaceStorageQuota | null>;
  }

  async upsertQuota(workspaceId: string, quotaBytes: number): Promise<IWorkspaceStorageQuota> {
    return this.prisma.workspaceStorageQuota.upsert({
      where: { workspaceId },
      create: { workspaceId, quotaBytes },
      update: { quotaBytes },
    }) as Promise<IWorkspaceStorageQuota>;
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private buildWhere(filter: FileFilterDto, workspaceId: string): Record<string, unknown> {
    const where: Record<string, unknown> = { workspaceId, deletedAt: null };

    if (filter.module) where.module = filter.module;
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.folderId) where.folderId = filter.folderId;
    if (filter.category) where.category = filter.category;
    if (filter.status) where.status = filter.status;
    if (filter.ownerId) where.ownerId = filter.ownerId;
    if (filter.tags && filter.tags.length > 0) where.tags = { hasSome: filter.tags };

    if (filter.startDate || filter.endDate) {
      const createdAt: Record<string, Date> = {};
      if (filter.startDate) createdAt.gte = new Date(filter.startDate);
      if (filter.endDate) createdAt.lte = new Date(filter.endDate);
      where.createdAt = createdAt;
    }

    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { originalName: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}
