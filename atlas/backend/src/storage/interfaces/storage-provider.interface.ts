export interface IStorageUploadInput {
  workspaceId: string;
  /** Logical relative key the provider is asked to store the content under (e.g. `${category}/${uuid}.${ext}`). */
  key: string;
  buffer: Buffer;
}

export interface IStorageUploadResult {
  /** Provider-specific reference to persist on the FileRecord (relative key for local fs; bucket/key for S3-style providers). */
  reference: string;
  sizeBytes: number;
}

export interface IStorageDownloadResult {
  buffer: Buffer;
  sizeBytes: number;
}

/**
 * Generic storage-provider contract. Every concrete provider (local
 * filesystem today; S3/GCS/Azure Blob later) implements this and never
 * leaks its own credentials/wire format past this boundary — callers only
 * ever see `reference` strings, never raw provider credentials or paths.
 */
export interface IStorageProvider {
  getProviderKey(): string;
  upload(input: IStorageUploadInput): Promise<IStorageUploadResult>;
  download(workspaceId: string, reference: string): Promise<IStorageDownloadResult>;
  delete(workspaceId: string, reference: string): Promise<void>;
  exists(workspaceId: string, reference: string): Promise<boolean>;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
