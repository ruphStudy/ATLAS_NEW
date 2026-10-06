export enum ExportType {
  REPORT = 'report',
  DASHBOARD = 'dashboard',
  ANALYTICS_TABLE = 'analytics_table',
  DATASET = 'dataset',
}

export enum ExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
  PDF = 'pdf',
  JSON = 'json',
}

export enum ExportMode {
  SYNC = 'sync',
  ASYNC = 'async',
}

export enum ExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum ExportEventType {
  EXPORT_REQUESTED = 'export_requested',
  EXPORT_STARTED = 'export_started',
  EXPORT_PROGRESS = 'export_progress',
  EXPORT_COMPLETED = 'export_completed',
  EXPORT_FAILED = 'export_failed',
  EXPORT_CANCELLED = 'export_cancelled',
  EXPORT_EXPIRED = 'export_expired',
  EXPORT_DOWNLOADED = 'export_downloaded',
  EXPORT_CLEANUP = 'export_cleanup',
  BULK_EXPORT_STARTED = 'bulk_export_started',
  BULK_EXPORT_COMPLETED = 'bulk_export_completed',
}

export interface IExportConfig {
  columns?: string[];
  columnOrder?: string[];
  formatting?: {
    locale?: string;
    timezone?: string;
    currency?: string;
    dateFormat?: string;
    numberFormat?: string;
  };
  filters?: any[];
  dateRange?: {
    start: Date;
    end: Date;
    presetKey?: string;
  };
  grouping?: any[];
  sorting?: any[];
  includeCalculatedFields?: boolean;
  includeHeaders?: boolean;
  includeMetadata?: boolean;
  pageSize?: number;
}

export interface IExportRequest {
  id: string;
  workspaceId: string;
  exportKey: string;
  type: ExportType;
  format: ExportFormat;
  mode: ExportMode;
  status: ExportStatus;
  sourceId: string;
  sourceName: string;
  config: IExportConfig;
  idempotencyKey?: string;
  estimatedSize?: number;
  estimatedRows?: number;
  priority: number;
  maxRetries: number;
  retryCount: number;
  retryBackoff: {
    type: 'fixed' | 'exponential';
    initialDelayMs: number;
    maxDelayMs: number;
    multiplier?: number;
  };
  scheduledExportId?: string;
  bulkExportId?: string;
  requestedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExportExecution {
  id: string;
  exportRequestId: string;
  workspaceId: string;
  exportKey: string;
  status: ExportStatus;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  progress?: number;
  progressMessage?: string;
  rowsProcessed?: number;
  rowsTotal?: number;
  fileSize?: number;
  filePath?: string;
  downloadUrl?: string;
  downloadExpiresAt?: Date;
  errorCode?: string;
  errorMessage?: string;
  errorStack?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBulkExport {
  id: string;
  workspaceId: string;
  bulkKey: string;
  name: string;
  description?: string;
  exportRequestIds: string[];
  status: ExportStatus;
  totalExports: number;
  completedExports: number;
  failedExports: number;
  requestedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExportFile {
  id: string;
  exportExecutionId: string;
  workspaceId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  format: ExportFormat;
  mimeType: string;
  downloadUrl: string;
  downloadExpiresAt: Date;
  downloadCount: number;
  maxDownloads?: number;
  retentionPolicy?: {
    deleteAfterDays: number;
    deleteAfterDownloads?: number;
  };
  isExpired: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExportEventPayload {
  event: ExportEventType;
  workspaceId: string;
  exportRequestId?: string;
  exportExecutionId?: string;
  bulkExportId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface IExportResult {
  exportRequestId: string;
  exportExecutionId: string;
  status: ExportStatus;
  downloadUrl?: string;
  downloadExpiresAt?: Date;
  fileSize?: number;
  rowsProcessed?: number;
  duration?: number;
  metadata?: Record<string, any>;
}
