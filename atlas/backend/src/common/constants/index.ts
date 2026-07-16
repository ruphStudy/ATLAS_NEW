export const APP_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_CURRENCY: 'USD',
  DEFAULT_LOCALE: 'en-US',
  DEFAULT_TIMEZONE: 'UTC',
} as const;

export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  REPORTS: 'reports',
  MARKETPLACE_SYNC: 'marketplace-sync',
  AI_PROCESSING: 'ai-processing',
  EMAIL: 'email',
  DISCOVERY: 'discovery',
  SUPPLIER_DISCOVERY: 'supplier-discovery',
  SUPPLIER_VERIFICATION: 'supplier-verification',
  PRODUCT_ANALYSIS: 'product-analysis',
} as const;

export const CACHE_KEYS = {
  WORKSPACE_SETTINGS: (workspaceId: string) => `workspace:${workspaceId}:settings`,
  USER_PROFILE: (userId: string) => `user:${userId}:profile`,
  DASHBOARD_STATS: (workspaceId: string) => `workspace:${workspaceId}:dashboard`,
} as const;

export const CACHE_TTL = {
  SHORT: 60,         // 1 minute
  MEDIUM: 300,       // 5 minutes
  LONG: 3600,        // 1 hour
  VERY_LONG: 86400,  // 24 hours
} as const;

/** Standard HTTP header names used across the application */
export const HTTP_HEADERS = {
  REQUEST_ID: 'x-request-id',
  WORKSPACE_ID: 'x-workspace-id',
  AUTHORIZATION: 'authorization',
  CONTENT_TYPE: 'content-type',
  ACCEPT: 'accept',
} as const;

/** API versioning and routing */
export const API = {
  PREFIX: 'api',
  VERSION: '1',
  DOCS_PATH: 'api/docs',
} as const;
