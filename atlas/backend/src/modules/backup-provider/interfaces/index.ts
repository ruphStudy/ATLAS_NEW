// =============================================================
// Backup Provider Foundation – Core Interfaces & Contracts
//
// A generic, string-keyed registry + adapter contract for discovering
// and restoring backups across whatever infrastructure targets the
// platform actually has (database, cache, queue, file storage, search
// index, configuration, secrets references, metadata). No concrete
// provider ships here — "Do not hardcode infrastructure/provider-
// specific recovery logic; keep it behind adapters/configuration."
// Disaster Recovery consumes this registry and degrades gracefully
// (reports zero discovered backups) when nothing is registered yet.
// =============================================================

export enum BackupTargetType {
  DATABASE = 'DATABASE',
  CACHE = 'CACHE',
  QUEUE = 'QUEUE',
  FILES = 'FILES',
  CONFIGURATION = 'CONFIGURATION',
  SECRETS_REFERENCE = 'SECRETS_REFERENCE',
  SEARCH_INDEX = 'SEARCH_INDEX',
  METADATA = 'METADATA',
}

export enum BackupProviderHealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  UNKNOWN = 'UNKNOWN',
}

/** How a backup was produced — not every provider/target combination supports every type. */
export enum BackupType {
  FULL = 'FULL',
  INCREMENTAL = 'INCREMENTAL',
  DIFFERENTIAL = 'DIFFERENTIAL',
  SNAPSHOT = 'SNAPSHOT',
}

export interface IBackupProviderMetadata {
  providerKey: string;
  displayName: string;
  version: { major: number; minor: number; patch: number };
  supportedTargetTypes: BackupTargetType[];
  supportsRegionalFailover: boolean;
}

/** A discovered backup — metadata only, never the backup payload or any secret value itself. */
export interface IBackupDescriptor {
  providerKey: string;
  targetType: BackupTargetType;
  /** Provider-specific identifier for this backup — opaque to Disaster Recovery, meaningful only to the adapter that produced it. */
  externalRef: string;
  capturedAt: Date;
  sizeBytes?: number;
  checksum?: string;
  /** Non-secret descriptive metadata only (e.g. region, retention class) — never credentials or secret values. */
  metadata?: Record<string, unknown>;
}

export interface IBackupIntegrityResult {
  valid: boolean;
  message?: string;
}

export interface IBackupRestoreOptions {
  isDryRun: boolean;
  targetWorkspaceIds?: string[];
}

export interface IBackupRestoreResult {
  success: boolean;
  simulated: boolean;
  message?: string;
  restoredAt: Date;
  details?: Record<string, unknown>;
}

export interface IBackupProviderHealth {
  providerKey: string;
  status: BackupProviderHealthStatus;
  latencyMs?: number;
  message?: string;
  checkedAt: Date;
}

/** Encryption/compression are declared here as configuration the adapter is asked to honor — the actual cipher/algorithm implementation always stays inside the adapter, never in Backup Management's core logic. */
export interface IBackupCreationOptions {
  backupType: BackupType;
  encryption?: { enabled: boolean; algorithm?: string };
  compression?: { enabled: boolean; algorithm?: string };
  /** Non-secret descriptive metadata only. */
  metadata?: Record<string, unknown>;
}

export interface IBackupCreationResult {
  success: boolean;
  descriptor?: IBackupDescriptor;
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * IBackupProviderAdapter
 *
 * The generic contract every backup/restore integration depends on.
 * Disaster Recovery and this foundation module interact only through
 * this interface — never through a concrete provider SDK.
 */
export interface IBackupProviderAdapter {
  readonly metadata: IBackupProviderMetadata;

  supportsTargetType(targetType: BackupTargetType): boolean;

  discoverBackups(targetType: BackupTargetType, workspaceId?: string): Promise<IBackupDescriptor[]>;
  validateIntegrity(descriptor: IBackupDescriptor): Promise<IBackupIntegrityResult>;
  restore(descriptor: IBackupDescriptor, options: IBackupRestoreOptions): Promise<IBackupRestoreResult>;

  /** Only implemented by adapters that support actively triggering a new backup (vs. only discovering ones created externally). */
  createBackup?(targetType: BackupTargetType, workspaceId: string | undefined, options: IBackupCreationOptions): Promise<IBackupCreationResult>;

  /** Only implemented by adapters whose `metadata.supportsRegionalFailover` is true. */
  failoverToRegion?(region: string, options: IBackupRestoreOptions): Promise<IBackupRestoreResult>;

  testConnection(): Promise<IBackupProviderHealth>;
  healthCheck(): Promise<IBackupProviderHealth>;
}

export interface IBackupProviderRegistry {
  register(adapter: IBackupProviderAdapter): void;
  get(providerKey: string): IBackupProviderAdapter;
  getAll(): IBackupProviderAdapter[];
  isRegistered(providerKey: string): boolean;
  getSupportedKeys(): string[];
  getCapable(targetType: BackupTargetType): IBackupProviderAdapter[];
}
