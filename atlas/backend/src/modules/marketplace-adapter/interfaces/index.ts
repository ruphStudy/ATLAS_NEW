export enum AdapterCapability {
  CATALOG_READ = 'CATALOG_READ',
  CATALOG_WRITE = 'CATALOG_WRITE',
  INVENTORY_READ = 'INVENTORY_READ',
  INVENTORY_WRITE = 'INVENTORY_WRITE',
  LISTING_READ = 'LISTING_READ',
  LISTING_WRITE = 'LISTING_WRITE',
  ORDER_READ = 'ORDER_READ',
  ORDER_WRITE = 'ORDER_WRITE',
  SHIPMENT_READ = 'SHIPMENT_READ',
  SHIPMENT_WRITE = 'SHIPMENT_WRITE',
  RETURN_READ = 'RETURN_READ',
  RETURN_WRITE = 'RETURN_WRITE',
  PRICING_READ = 'PRICING_READ',
  PRICING_WRITE = 'PRICING_WRITE',
  REPORT_READ = 'REPORT_READ',
  WEBHOOK_MANAGEMENT = 'WEBHOOK_MANAGEMENT',
  BATCH_OPERATIONS = 'BATCH_OPERATIONS',
  REAL_TIME_SYNC = 'REAL_TIME_SYNC',
}

export enum AdapterOperation {
  GET_CATALOG = 'GET_CATALOG',
  UPDATE_CATALOG = 'UPDATE_CATALOG',
  GET_INVENTORY = 'GET_INVENTORY',
  UPDATE_INVENTORY = 'UPDATE_INVENTORY',
  GET_LISTING = 'GET_LISTING',
  CREATE_LISTING = 'CREATE_LISTING',
  UPDATE_LISTING = 'UPDATE_LISTING',
  DELETE_LISTING = 'DELETE_LISTING',
  GET_ORDER = 'GET_ORDER',
  UPDATE_ORDER = 'UPDATE_ORDER',
  GET_SHIPMENT = 'GET_SHIPMENT',
  CREATE_SHIPMENT = 'CREATE_SHIPMENT',
  UPDATE_SHIPMENT = 'UPDATE_SHIPMENT',
  GET_RETURN = 'GET_RETURN',
  PROCESS_RETURN = 'PROCESS_RETURN',
  GET_PRICING = 'GET_PRICING',
  UPDATE_PRICING = 'UPDATE_PRICING',
  GET_REPORT = 'GET_REPORT',
  REGISTER_WEBHOOK = 'REGISTER_WEBHOOK',
  UNREGISTER_WEBHOOK = 'UNREGISTER_WEBHOOK',
  HEALTH_CHECK = 'HEALTH_CHECK',
  CONNECTION_TEST = 'CONNECTION_TEST',
}

export enum AdapterStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
  INITIALIZING = 'INITIALIZING',
  DISCONNECTED = 'DISCONNECTED',
}

export enum ApiVersion {
  V1 = 'V1',
  V2 = 'V2',
  V3 = 'V3',
  LATEST = 'LATEST',
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export interface IAdapterConfig {
  workspaceId: string;
  provider: string;
  accountId: string;
  apiVersion?: ApiVersion;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  enableTracing?: boolean;
  customSettings?: Record<string, any>;
}

export interface IAdapterCredentials {
  workspaceId: string;
  provider: string;
  accountId: string;
  credentialType: string;
  credentials: Record<string, any>;
  expiresAt?: Date;
}

export interface IRequestContext {
  workspaceId: string;
  provider: string;
  accountId: string;
  operation: AdapterOperation;
  requestId: string;
  correlationId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface IPaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
  offset?: number;
}

export interface IPaginationMetadata {
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  nextCursor?: string;
  previousCursor?: string;
}

export interface IRateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

export interface IAdapterError {
  code: string;
  message: string;
  providerCode?: string;
  providerMessage?: string;
  statusCode?: number;
  retryable?: boolean;
  retryAfter?: number;
  metadata?: Record<string, any>;
}

export interface IAdapterResponse<T = any> {
  success: boolean;
  data?: T;
  error?: IAdapterError;
  pagination?: IPaginationMetadata;
  rateLimit?: IRateLimitInfo;
  metadata?: {
    requestId: string;
    duration: number;
    attempts: number;
    timestamp: Date;
  };
}

export interface IAdapterCapabilities {
  provider: string;
  apiVersion: ApiVersion;
  supportedCapabilities: AdapterCapability[];
  supportedOperations: AdapterOperation[];
  rateLimits?: {
    [operation: string]: {
      maxRequests: number;
      windowMs: number;
    };
  };
  batchSizes?: {
    [operation: string]: number;
  };
  webhookSupport?: {
    maxWebhooks: number;
    supportedEvents: string[];
  };
}

export interface IAdapterHealthCheck {
  status: AdapterStatus;
  lastChecked: Date;
  responseTime?: number;
  errors?: IAdapterError[];
  metadata?: Record<string, any>;
}

export interface IAdapterConnectionTest {
  success: boolean;
  provider: string;
  accountId: string;
  testedAt: Date;
  responseTime: number;
  capabilities?: IAdapterCapabilities;
  error?: IAdapterError;
}

export interface ICatalogOperations {
  getCatalog(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse>;
  updateCatalog(
    context: IRequestContext,
    data: any,
  ): Promise<IAdapterResponse>;
}

export interface IInventoryOperations {
  getInventory(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse>;
  updateInventory(
    context: IRequestContext,
    data: any,
  ): Promise<IAdapterResponse>;
}

export interface IListingOperations {
  getListing(
    context: IRequestContext,
    listingId: string,
  ): Promise<IAdapterResponse>;
  createListing(
    context: IRequestContext,
    data: any,
  ): Promise<IAdapterResponse>;
  updateListing(
    context: IRequestContext,
    listingId: string,
    data: any,
  ): Promise<IAdapterResponse>;
  deleteListing(
    context: IRequestContext,
    listingId: string,
  ): Promise<IAdapterResponse>;
  listListings(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse>;
}

export interface IOrderOperations {
  getOrder(
    context: IRequestContext,
    orderId: string,
  ): Promise<IAdapterResponse>;
  updateOrder(
    context: IRequestContext,
    orderId: string,
    data: any,
  ): Promise<IAdapterResponse>;
  listOrders(
    context: IRequestContext,
    params?: IPaginationParams & { startDate?: Date; endDate?: Date },
  ): Promise<IAdapterResponse>;
}

export interface IShipmentOperations {
  getShipment(
    context: IRequestContext,
    shipmentId: string,
  ): Promise<IAdapterResponse>;
  createShipment(
    context: IRequestContext,
    data: any,
  ): Promise<IAdapterResponse>;
  updateShipment(
    context: IRequestContext,
    shipmentId: string,
    data: any,
  ): Promise<IAdapterResponse>;
  listShipments(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse>;
}

export interface IReturnOperations {
  getReturn(
    context: IRequestContext,
    returnId: string,
  ): Promise<IAdapterResponse>;
  processReturn(
    context: IRequestContext,
    returnId: string,
    data: any,
  ): Promise<IAdapterResponse>;
  listReturns(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse>;
}

export interface IPricingOperations {
  getPricing(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse>;
  updatePricing(
    context: IRequestContext,
    data: any,
  ): Promise<IAdapterResponse>;
}

export interface IReportOperations {
  getReport(
    context: IRequestContext,
    reportType: string,
    params?: any,
  ): Promise<IAdapterResponse>;
  listReports(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse>;
}

export interface IWebhookOperations {
  registerWebhook(
    context: IRequestContext,
    data: {
      url: string;
      events: string[];
      secret?: string;
    },
  ): Promise<IAdapterResponse>;
  unregisterWebhook(
    context: IRequestContext,
    webhookId: string,
  ): Promise<IAdapterResponse>;
  listWebhooks(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse>;
}

export interface IAdapter
  extends ICatalogOperations,
    IInventoryOperations,
    IListingOperations,
    IOrderOperations,
    IShipmentOperations,
    IReturnOperations,
    IPricingOperations,
    IReportOperations,
    IWebhookOperations {
  initialize(
    config: IAdapterConfig,
    credentials: IAdapterCredentials,
  ): Promise<void>;
  getCapabilities(): IAdapterCapabilities;
  healthCheck(): Promise<IAdapterHealthCheck>;
  testConnection(): Promise<IAdapterConnectionTest>;
  destroy(): Promise<void>;
}

export interface IAdapterRegistry {
  register(provider: string, adapter: new () => IAdapter): void;
  get(provider: string): new () => IAdapter | undefined;
  has(provider: string): boolean;
  list(): string[];
}

export interface IAdapterFactory {
  create(
    provider: string,
    config: IAdapterConfig,
    credentials: IAdapterCredentials,
  ): Promise<IAdapter>;
  destroy(provider: string, accountId: string): Promise<void>;
}

export interface IHttpRequest {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
}

export interface IHttpResponse<T = any> {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
}

export interface IRetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryableStatusCodes?: number[];
  retryableErrors?: string[];
  backoffMultiplier?: number;
}

export interface IThrottleConfig {
  maxRequests: number;
  windowMs: number;
}

export interface IRequestTrace {
  requestId: string;
  method: HttpMethod;
  url: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  statusCode?: number;
  attempts: number;
  error?: IAdapterError;
}
