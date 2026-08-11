import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, normalize, relative, isAbsolute } from 'path';
import { ConfigurationService } from '@config/configuration.service';
import {
  IStorageProvider,
  IStorageUploadInput,
  IStorageUploadResult,
  IStorageDownloadResult,
} from '../interfaces';
import {
  StorageObjectNotFoundException,
  StorageWriteFailedException,
  StorageReadFailedException,
  StorageInvalidReferenceException,
} from '../exceptions/storage.exceptions';

export const LOCAL_FILESYSTEM_PROVIDER_KEY = 'local-filesystem';

/**
 * Default `IStorageProvider` implementation — stores file bytes on local
 * disk under a configured base path, scoped per workspace. Swappable for a
 * remote provider (S3/GCS/Azure Blob) later by binding a different class to
 * the same `STORAGE_PROVIDER` token in `StorageModule` — callers never
 * depend on this class directly, only on `IStorageProvider`.
 */
@Injectable()
export class LocalFilesystemStorageProvider implements IStorageProvider {
  private readonly logger = new Logger(LocalFilesystemStorageProvider.name);

  constructor(private readonly configurationService: ConfigurationService) {}

  getProviderKey(): string {
    return LOCAL_FILESYSTEM_PROVIDER_KEY;
  }

  async upload(input: IStorageUploadInput): Promise<IStorageUploadResult> {
    const fullPath = this.resolvePath(input.workspaceId, input.key);

    try {
      await fs.mkdir(join(fullPath, '..'), { recursive: true });
      await fs.writeFile(fullPath, input.buffer);
      return { reference: input.key, sizeBytes: input.buffer.length };
    } catch (error) {
      throw new StorageWriteFailedException((error as Error).message);
    }
  }

  async download(workspaceId: string, reference: string): Promise<IStorageDownloadResult> {
    const fullPath = this.resolvePath(workspaceId, reference);

    try {
      const buffer = await fs.readFile(fullPath);
      return { buffer, sizeBytes: buffer.length };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new StorageObjectNotFoundException();
      }
      throw new StorageReadFailedException((error as Error).message);
    }
  }

  async delete(workspaceId: string, reference: string): Promise<void> {
    const fullPath = this.resolvePath(workspaceId, reference);

    try {
      await fs.unlink(fullPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(`Failed to delete stored file ${reference}: ${(error as Error).message}`);
      }
    }
  }

  async exists(workspaceId: string, reference: string): Promise<boolean> {
    const fullPath = this.resolvePath(workspaceId, reference);

    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /** Resolves + validates a workspace-scoped path, rejecting any reference that would escape the workspace directory. */
  private resolvePath(workspaceId: string, reference: string): string {
    const basePath = this.configurationService.getStorageConfig().basePath;
    const workspaceDir = normalize(join(basePath, workspaceId));
    const fullPath = normalize(join(workspaceDir, reference));

    const rel = relative(workspaceDir, fullPath);
    if (rel.startsWith('..') || isAbsolute(rel)) {
      throw new StorageInvalidReferenceException();
    }

    return fullPath;
  }
}
