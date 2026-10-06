export enum ApiVersion {
  V1 = 'v1',
  V2 = 'v2',
}

export enum ApiEndpoint {
  DASHBOARD = 'dashboard',
  KPI = 'kpi',
  REPORT = 'report',
  ANALYTICS = 'analytics',
  FORECAST = 'forecast',
  INSIGHT = 'insight',
  EXPORT = 'export',
}

export enum QueryMode {
  SUMMARY = 'summary',
  DETAIL = 'detail',
  DRILL_DOWN = 'drill_down',
  BULK = 'bulk',
}

export enum AnalyticsApiEventType {
  API_REQUEST_RECEIVED = 'api_request_received',
  API_RESPONSE_SENT = 'api_response_sent',
  ASYNC_OPERATION_STARTED = 'async_operation_started',
  ASYNC_OPERATION_COMPLETED = 'async_operation_completed',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
}

export interface IApiFilter {
  workspaceId: string;
  marketplaceId?: string;
  providerId?: string;
  accountId?: string;
  warehouseId?: string;
  productId?: string;
  supplierId?: string;
  countryCode?: string;
  currencyCode?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface IApiDimension {
  field: string;
  alias?: string;
  groupBy?: boolean;
}

export interface IApiMetric {
  field: string;
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
  alias?: string;
}

export interface IApiSort {
  field: string;
  order: 'asc' | 'desc';
}

export interface IApiPagination {
  page: number;
  limit: number;
  offset?: number;
}

export interface IAsyncOperation {
  id: string;
  workspaceId: string;
  endpoint: ApiEndpoint;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  resultUrl?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface IRateLimitStatus {
  workspaceId: string;
  endpoint: ApiEndpoint;
  requestCount: number;
  windowStart: Date;
  windowEnd: Date;
  limit: number;
  remaining: number;
}

export interface IAnalyticsApiEventPayload {
  event: AnalyticsApiEventType;
  workspaceId: string;
  endpoint?: ApiEndpoint;
  version?: ApiVersion;
  asyncOperationId?: string;
  statusCode?: number;
  duration?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface IApiResponse<T> {
  version: ApiVersion;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp: Date;
    etag?: string;
  };
}
