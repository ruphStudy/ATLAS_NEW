export enum ReportType {
  ALL = 'ALL',
  SALES = 'SALES',
  ORDERS = 'ORDERS',
  INVENTORY = 'INVENTORY',
  LISTINGS = 'LISTINGS',
  PRICING = 'PRICING',
  FEES = 'FEES',
  SETTLEMENTS = 'SETTLEMENTS',
  RETURNS = 'RETURNS',
  PERFORMANCE = 'PERFORMANCE',
  CUSTOM = 'CUSTOM',
}

export enum ReportFormat {
  CSV = 'CSV',
  JSON = 'JSON',
  XML = 'XML',
  GZIP = 'GZIP',
  ZIP = 'ZIP',
  TSV = 'TSV',
}

export enum ReportStatus {
  REQUESTED = 'REQUESTED',
  PROCESSING = 'PROCESSING',
  AVAILABLE = 'AVAILABLE',
  DOWNLOADED = 'DOWNLOADED',
  IMPORTED = 'IMPORTED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum ReportSyncEvent {
  SYNC_STARTED = 'SYNC_STARTED',
  SYNC_COMPLETED = 'SYNC_COMPLETED',
  SYNC_FAILED = 'SYNC_FAILED',
  SYNC_CANCELLED = 'SYNC_CANCELLED',
  REPORT_REQUESTED = 'REPORT_REQUESTED',
  REPORT_GENERATED = 'REPORT_GENERATED',
  REPORT_DOWNLOADED = 'REPORT_DOWNLOADED',
  REPORT_IMPORTED = 'REPORT_IMPORTED',
  REPORT_FAILED = 'REPORT_FAILED',
  REPORT_EXPIRED = 'REPORT_EXPIRED',
  REPORT_SKIPPED = 'REPORT_SKIPPED',
  REPORT_PARSING_STARTED = 'REPORT_PARSING_STARTED',
  REPORT_PARSING_COMPLETED = 'REPORT_PARSING_COMPLETED',
  REPORT_PARSING_FAILED = 'REPORT_PARSING_FAILED',
}

export enum SyncDirection {
  INBOUND = 'INBOUND',
}

export enum SyncMode {
  FULL = 'FULL',
  INCREMENTAL = 'INCREMENTAL',
  MANUAL = 'MANUAL',
  DATE_RANGE = 'DATE_RANGE',
}

export enum SyncStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  PARTIAL = 'PARTIAL',
}

export enum ItemSyncStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export interface IReportSyncJob {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  reportType: ReportType;
  mode: SyncMode;
  status: SyncStatus;
  startDate?: Date;
  endDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
  totalReports: number;
  processedReports: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  cursor?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface NormalizedReportItem {
  externalReportId: string;
  externalRequestId?: string;
  reportType: ReportType;
  reportFormat: ReportFormat;
  status: ReportStatus;
  requestedAt?: Date;
  generatedAt?: Date;
  availableUntil?: Date;
  downloadUrl?: string;
  fileSize?: number;
  filePath?: string;
  checksum?: string;
  metadata?: {
    startDate?: Date;
    endDate?: Date;
    recordCount?: number;
    compressed?: boolean;
    encoding?: string;
    [key: string]: any;
  };
  rawData: Record<string, any>;
}

export interface ReportSyncResult {
  success: boolean;
  reportsProcessed: number;
  reportsImported: number;
  reportsSkipped: number;
  reportsFailed: number;
  recordsImported: number;
  nextCursor?: string;
  hasMore: boolean;
  errors: Array<{
    externalReportId: string;
    error: string;
  }>;
}

export interface ReportSyncAdapter {
  requestReport(params: {
    accountId: string;
    reportType: ReportType;
    startDate?: Date;
    endDate?: Date;
    options?: Record<string, any>;
  }): Promise<{
    success: boolean;
    externalRequestId: string;
    externalReportId?: string;
    estimatedCompletionTime?: Date;
    error?: string;
  }>;

  checkReportStatus(params: {
    accountId: string;
    externalRequestId: string;
  }): Promise<{
    status: ReportStatus;
    externalReportId?: string;
    downloadUrl?: string;
    availableUntil?: Date;
    error?: string;
  }>;

  listReports(params: {
    accountId: string;
    reportType?: ReportType;
    startDate?: Date;
    endDate?: Date;
    cursor?: string;
    limit?: number;
  }): Promise<{
    items: NormalizedReportItem[];
    nextCursor?: string;
    hasMore: boolean;
  }>;

  downloadReport(params: {
    accountId: string;
    externalReportId: string;
    downloadUrl?: string;
  }): Promise<{
    success: boolean;
    filePath: string;
    fileSize: number;
    checksum: string;
    format: ReportFormat;
    error?: string;
  }>;

  cancelReport(params: {
    accountId: string;
    externalRequestId: string;
  }): Promise<{
    success: boolean;
    error?: string;
  }>;
}

export interface ReportSyncConfig {
  workspaceId: string;
  accountId: string;
  reportType: ReportType;
  mode: SyncMode;
  startDate?: Date;
  endDate?: Date;
  batchSize?: number;
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  pollInterval?: number;
  maxPollAttempts?: number;
}

export interface ReportSyncMetadata {
  totalPages?: number;
  currentPage?: number;
  reportsPerPage?: number;
  filters?: Record<string, any>;
  triggerSource?: string;
  triggeredBy?: string;
  notes?: string;
}

export interface ParsedReportData {
  reportId: string;
  reportType: ReportType;
  recordCount: number;
  records: Array<Record<string, any>>;
  errors: Array<{
    row?: number;
    field?: string;
    error: string;
  }>;
  metadata: {
    startDate?: Date;
    endDate?: Date;
    currency?: string;
    totals?: Record<string, any>;
    [key: string]: any;
  };
}
