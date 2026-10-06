import { Injectable, Logger, Inject } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { ConfigurationService } from '@config/configuration.service';
import { STORAGE_PROVIDER, IStorageProvider } from '../../storage/interfaces';
import { FileManagementRepository } from './file-management.repository';
import { FileEventQueue } from './jobs';
import {
  UploadFileDto,
  FileFilterDto,
  RenameFileDto,
  MoveFileDto,
  CopyFileDto,
  AddFileVersionDto,
  CreateFolderDto,
  IssueAccessTokenDto,
  PaginatedFileResponseDto,
  StorageQuotaResponseDto,
} from './dto';
import {
  IFileRecord,
  IFileVersionRecord,
  IFileFolder,
  IFileAccessToken,
  FileCategory,
  FileStatus,
  FileEvent,
} from './interfaces';
import {
  FileNotFoundException,
  FileTypeNotAllowedException,
  FileTooLargeException,
  FileIntegrityMismatchException,
  FileQuotaExceededException,
  FileFolderNotFoundException,
  FileAccessTokenInvalidException,
  FileInvalidStateTransitionException,
} from './exceptions/file.exceptions';
import { ALLOWED_MIME_TYPES, MAX_VERSION_HISTORY_ROWS } from './constants';

export interface IDownloadedFile {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}

@Injectable()
export class FileManagementService {
  private readonly logger = new Logger(FileManagementService.name);

  constructor(
    private readonly repository: FileManagementRepository,
    private readonly configurationService: ConfigurationService,
    private readonly eventQueue: FileEventQueue,
    @Inject(STORAGE_PROVIDER) private readonly storageProvider: IStorageProvider,
  ) {}

  // ── Upload ───────────────────────────────────────────────────────

  async upload(workspaceId: string, ownerId: string, dto: UploadFileDto): Promise<IFileRecord> {
    const buffer = Buffer.from(dto.contentBase64, 'base64');
    const config = this.configurationService.getStorageConfig();

    if (buffer.length > config.maxFileSizeBytes) {
      throw new FileTooLargeException(config.maxFileSizeBytes);
    }

    const category = dto.category ?? ALLOWED_MIME_TYPES[dto.mimeType];
    if (!category) {
      throw new FileTypeNotAllowedException(dto.mimeType);
    }

    const checksum = this.computeChecksum(buffer);
    if (dto.checksum && dto.checksum !== checksum) {
      throw new FileIntegrityMismatchException();
    }

    const existing = await this.repository.findByChecksum(workspaceId, checksum);
    if (existing) {
      return existing;
    }

    await this.assertWithinQuota(workspaceId, buffer.length);

    if (dto.folderId) {
      await this.getFolderOrThrow(dto.folderId, workspaceId);
    }

    const extension = this.extractExtension(dto.fileName);
    const key = `${randomBytes(16).toString('hex')}${extension ? `.${extension}` : ''}`;
    const uploadResult = await this.storageProvider.upload({ workspaceId, key, buffer });

    const record = await this.repository.create({
      workspaceId,
      name: dto.fileName,
      originalName: dto.fileName,
      extension,
      mimeType: dto.mimeType,
      category,
      sizeBytes: uploadResult.sizeBytes,
      checksum,
      storageProviderKey: this.storageProvider.getProviderKey(),
      storageReference: uploadResult.reference,
      module: dto.module,
      entityType: dto.entityType,
      entityId: dto.entityId,
      folderId: dto.folderId,
      tags: dto.tags ?? [],
      version: 1,
      status: FileStatus.ACTIVE,
      ownerId,
      downloadCount: 0,
      metadata: dto.metadata ?? {},
    });

    await this.publishEvent(FileEvent.FILE_UPLOADED, workspaceId, record.id, ownerId);
    return record;
  }

  // ── Download / preview ───────────────────────────────────────────

  async download(id: string, workspaceId: string): Promise<IDownloadedFile> {
    const file = await this.getFileOrThrow(id, workspaceId);
    const { buffer } = await this.storageProvider.download(workspaceId, file.storageReference);

    await this.repository.update(id, workspaceId, {
      downloadCount: file.downloadCount + 1,
      lastAccessedAt: new Date(),
    } as Partial<IFileRecord>);

    await this.publishEvent(FileEvent.FILE_DOWNLOADED, workspaceId, id);
    return { buffer, fileName: file.name, mimeType: file.mimeType };
  }

  async preview(id: string, workspaceId: string): Promise<IDownloadedFile> {
    const file = await this.getFileOrThrow(id, workspaceId);
    const { buffer } = await this.storageProvider.download(workspaceId, file.storageReference);

    await this.repository.update(id, workspaceId, { lastAccessedAt: new Date() } as Partial<IFileRecord>);

    await this.publishEvent(FileEvent.FILE_PREVIEWED, workspaceId, id);
    return { buffer, fileName: file.name, mimeType: file.mimeType };
  }

  // ── Reads ────────────────────────────────────────────────────────

  async findById(id: string, workspaceId: string): Promise<IFileRecord> {
    return this.getFileOrThrow(id, workspaceId);
  }

  async findAll(workspaceId: string, filter: FileFilterDto): Promise<PaginatedFileResponseDto> {
    const [data, total] = await this.repository.findAll(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    return {
      data: data as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Rename / move / copy ─────────────────────────────────────────

  async rename(id: string, workspaceId: string, dto: RenameFileDto): Promise<IFileRecord> {
    await this.getFileOrThrow(id, workspaceId);
    const updated = await this.repository.update(id, workspaceId, { name: dto.name });
    await this.publishEvent(FileEvent.FILE_RENAMED, workspaceId, id);
    return updated;
  }

  async move(id: string, workspaceId: string, dto: MoveFileDto): Promise<IFileRecord> {
    await this.getFileOrThrow(id, workspaceId);
    if (dto.folderId) {
      await this.getFolderOrThrow(dto.folderId, workspaceId);
    }

    const updated = await this.repository.update(id, workspaceId, {
      folderId: dto.folderId ?? null,
    } as Partial<IFileRecord>);
    await this.publishEvent(FileEvent.FILE_MOVED, workspaceId, id);
    return updated;
  }

  async copy(id: string, workspaceId: string, ownerId: string, dto: CopyFileDto): Promise<IFileRecord> {
    const source = await this.getFileOrThrow(id, workspaceId);
    if (dto.folderId) {
      await this.getFolderOrThrow(dto.folderId, workspaceId);
    }

    await this.assertWithinQuota(workspaceId, source.sizeBytes);

    const { buffer } = await this.storageProvider.download(workspaceId, source.storageReference);
    const key = `${randomBytes(16).toString('hex')}${source.extension ? `.${source.extension}` : ''}`;
    const uploadResult = await this.storageProvider.upload({ workspaceId, key, buffer });

    const copyRecord = await this.repository.create({
      workspaceId,
      name: dto.name ?? source.name,
      originalName: source.originalName,
      extension: source.extension,
      mimeType: source.mimeType,
      category: source.category,
      sizeBytes: uploadResult.sizeBytes,
      checksum: source.checksum,
      storageProviderKey: this.storageProvider.getProviderKey(),
      storageReference: uploadResult.reference,
      module: source.module,
      entityType: source.entityType,
      entityId: source.entityId,
      folderId: dto.folderId ?? source.folderId,
      tags: source.tags,
      version: 1,
      status: FileStatus.ACTIVE,
      ownerId,
      downloadCount: 0,
      metadata: source.metadata as Record<string, unknown>,
    });

    await this.publishEvent(FileEvent.FILE_COPIED, workspaceId, copyRecord.id);
    return copyRecord;
  }

  // ── Versioning ───────────────────────────────────────────────────

  async addVersion(
    id: string,
    workspaceId: string,
    userId: string,
    dto: AddFileVersionDto,
  ): Promise<IFileRecord> {
    const file = await this.getFileOrThrow(id, workspaceId);
    const buffer = Buffer.from(dto.contentBase64, 'base64');
    const config = this.configurationService.getStorageConfig();

    if (buffer.length > config.maxFileSizeBytes) {
      throw new FileTooLargeException(config.maxFileSizeBytes);
    }

    const checksum = this.computeChecksum(buffer);
    if (dto.checksum && dto.checksum !== checksum) {
      throw new FileIntegrityMismatchException();
    }

    await this.assertWithinQuota(workspaceId, buffer.length - file.sizeBytes);

    await this.repository.createVersion({
      fileId: file.id,
      workspaceId,
      version: file.version,
      storageProviderKey: file.storageProviderKey,
      storageReference: file.storageReference,
      sizeBytes: file.sizeBytes,
      checksum: file.checksum,
      createdBy: userId,
    });

    const key = `${randomBytes(16).toString('hex')}${file.extension ? `.${file.extension}` : ''}`;
    const uploadResult = await this.storageProvider.upload({ workspaceId, key, buffer });

    const updated = await this.repository.update(id, workspaceId, {
      sizeBytes: uploadResult.sizeBytes,
      checksum,
      storageReference: uploadResult.reference,
      version: file.version + 1,
    } as Partial<IFileRecord>);

    await this.publishEvent(FileEvent.FILE_VERSION_ADDED, workspaceId, id, userId, {
      changeReason: dto.changeReason,
    });
    return updated;
  }

  async listVersions(id: string, workspaceId: string): Promise<IFileVersionRecord[]> {
    await this.getFileOrThrow(id, workspaceId);
    return this.repository.listVersions(id, workspaceId, MAX_VERSION_HISTORY_ROWS);
  }

  // ── Lifecycle: archive / restore / delete ────────────────────────

  async archive(id: string, workspaceId: string): Promise<IFileRecord> {
    const file = await this.getFileOrThrow(id, workspaceId);
    this.assertTransition(file.status, FileStatus.ARCHIVED);

    const updated = await this.repository.update(id, workspaceId, {
      status: FileStatus.ARCHIVED,
      archivedAt: new Date(),
    } as Partial<IFileRecord>);
    await this.publishEvent(FileEvent.FILE_ARCHIVED, workspaceId, id);
    return updated;
  }

  async restore(id: string, workspaceId: string): Promise<IFileRecord> {
    const file = await this.getFileOrThrow(id, workspaceId);
    this.assertTransition(file.status, FileStatus.ACTIVE);

    const updated = await this.repository.update(id, workspaceId, {
      status: FileStatus.ACTIVE,
      archivedAt: null,
    } as Partial<IFileRecord>);
    await this.publishEvent(FileEvent.FILE_RESTORED, workspaceId, id);
    return updated;
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    await this.getFileOrThrow(id, workspaceId);
    await this.repository.update(id, workspaceId, {
      status: FileStatus.DELETED,
      deletedAt: new Date(),
    } as Partial<IFileRecord>);
    await this.publishEvent(FileEvent.FILE_DELETED, workspaceId, id);
  }

  // ── Bulk operations ──────────────────────────────────────────────

  async bulkArchive(ids: string[], workspaceId: string): Promise<number> {
    const count = await this.repository.updateMany(ids, workspaceId, {
      status: FileStatus.ARCHIVED,
      archivedAt: new Date(),
    } as Partial<IFileRecord>);
    await Promise.all(ids.map((id) => this.publishEvent(FileEvent.FILE_ARCHIVED, workspaceId, id)));
    return count;
  }

  async bulkRestore(ids: string[], workspaceId: string): Promise<number> {
    const count = await this.repository.updateMany(ids, workspaceId, {
      status: FileStatus.ACTIVE,
      archivedAt: null,
    } as Partial<IFileRecord>);
    await Promise.all(ids.map((id) => this.publishEvent(FileEvent.FILE_RESTORED, workspaceId, id)));
    return count;
  }

  async bulkRemove(ids: string[], workspaceId: string): Promise<number> {
    const count = await this.repository.updateMany(ids, workspaceId, {
      status: FileStatus.DELETED,
      deletedAt: new Date(),
    } as Partial<IFileRecord>);
    await Promise.all(ids.map((id) => this.publishEvent(FileEvent.FILE_DELETED, workspaceId, id)));
    return count;
  }

  // ── Folders ──────────────────────────────────────────────────────

  async createFolder(workspaceId: string, userId: string, dto: CreateFolderDto): Promise<IFileFolder> {
    if (dto.parentFolderId) {
      await this.getFolderOrThrow(dto.parentFolderId, workspaceId);
    }

    return this.repository.createFolder({
      workspaceId,
      name: dto.name,
      parentFolderId: dto.parentFolderId,
      module: dto.module,
      createdBy: userId,
    });
  }

  async listFolders(workspaceId: string, parentFolderId?: string): Promise<IFileFolder[]> {
    return this.repository.listFolders(workspaceId, parentFolderId ?? null);
  }

  async removeFolder(id: string, workspaceId: string): Promise<void> {
    await this.getFolderOrThrow(id, workspaceId);
    await this.repository.softDeleteFolder(id, workspaceId);
  }

  // ── Access tokens ────────────────────────────────────────────────

  async issueAccessToken(
    id: string,
    workspaceId: string,
    userId: string,
    dto: IssueAccessTokenDto,
  ): Promise<IFileAccessToken> {
    await this.getFileOrThrow(id, workspaceId);
    const config = this.configurationService.getStorageConfig();
    const ttlMs = dto.ttlMs ?? config.accessTokenDefaultTtlMs;

    const token = await this.repository.createAccessToken({
      fileId: id,
      workspaceId,
      token: randomBytes(32).toString('hex'),
      purpose: dto.purpose,
      expiresAt: new Date(Date.now() + ttlMs),
      createdBy: userId,
      usedCount: 0,
      maxUses: dto.maxUses,
    });

    await this.publishEvent(FileEvent.FILE_ACCESS_TOKEN_ISSUED, workspaceId, id, userId);
    return token;
  }

  async consumeAccessToken(token: string): Promise<IDownloadedFile> {
    const accessToken = await this.repository.findAccessTokenByToken(token);
    if (!accessToken || accessToken.expiresAt.getTime() < Date.now()) {
      throw new FileAccessTokenInvalidException();
    }
    if (accessToken.maxUses !== null && accessToken.maxUses !== undefined && accessToken.usedCount >= accessToken.maxUses) {
      throw new FileAccessTokenInvalidException();
    }

    const file = await this.repository.findById(accessToken.fileId, accessToken.workspaceId);
    if (!file) {
      throw new FileAccessTokenInvalidException();
    }

    const { buffer } = await this.storageProvider.download(accessToken.workspaceId, file.storageReference);
    await this.repository.incrementAccessTokenUse(accessToken.id);

    return { buffer, fileName: file.name, mimeType: file.mimeType };
  }

  // ── Quota ────────────────────────────────────────────────────────

  async getQuota(workspaceId: string): Promise<StorageQuotaResponseDto> {
    const config = this.configurationService.getStorageConfig();
    const [quota, usedBytes] = await Promise.all([
      this.repository.findQuota(workspaceId),
      this.repository.aggregateUsedBytes(workspaceId),
    ]);

    const quotaBytes = quota?.quotaBytes ?? config.defaultWorkspaceQuotaBytes;
    return {
      workspaceId,
      quotaBytes,
      usedBytes,
      availableBytes: Math.max(0, quotaBytes - usedBytes),
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private async getFileOrThrow(id: string, workspaceId: string): Promise<IFileRecord> {
    const file = await this.repository.findById(id, workspaceId);
    if (!file) {
      throw new FileNotFoundException(id);
    }
    return file;
  }

  private async getFolderOrThrow(id: string, workspaceId: string): Promise<IFileFolder> {
    const folder = await this.repository.findFolderById(id, workspaceId);
    if (!folder) {
      throw new FileFolderNotFoundException(id);
    }
    return folder;
  }

  private async assertWithinQuota(workspaceId: string, additionalBytes: number): Promise<void> {
    if (additionalBytes <= 0) {
      return;
    }

    const config = this.configurationService.getStorageConfig();
    const [quota, usedBytes] = await Promise.all([
      this.repository.findQuota(workspaceId),
      this.repository.aggregateUsedBytes(workspaceId),
    ]);
    const quotaBytes = quota?.quotaBytes ?? config.defaultWorkspaceQuotaBytes;

    if (usedBytes + additionalBytes > quotaBytes) {
      await this.publishEvent(FileEvent.FILE_QUOTA_EXCEEDED, workspaceId);
      throw new FileQuotaExceededException();
    }
  }

  private assertTransition(from: FileStatus, to: FileStatus): void {
    const allowed: Record<FileStatus, FileStatus[]> = {
      [FileStatus.ACTIVE]: [FileStatus.ARCHIVED, FileStatus.DELETED],
      [FileStatus.ARCHIVED]: [FileStatus.ACTIVE, FileStatus.DELETED],
      [FileStatus.DELETED]: [],
    };

    if (!allowed[from]?.includes(to)) {
      throw new FileInvalidStateTransitionException(from, to);
    }
  }

  private computeChecksum(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  private extractExtension(fileName: string): string | undefined {
    const idx = fileName.lastIndexOf('.');
    return idx > 0 && idx < fileName.length - 1 ? fileName.slice(idx + 1).toLowerCase() : undefined;
  }

  private async publishEvent(
    event: FileEvent,
    workspaceId: string,
    fileId?: string,
    actorId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.publish({ event, workspaceId, fileId, actorId, metadata });
  }
}
