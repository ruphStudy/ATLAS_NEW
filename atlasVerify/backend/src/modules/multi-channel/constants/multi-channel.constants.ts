import { ChannelStatus } from '../interfaces';

export const MULTI_CHANNEL_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  CACHE_TTL_MS: 300_000, // 5 min — channel configuration changes rarely
  CACHE_MAX_ENTRIES: 1_000,

  DEFAULT_PRIORITY: 50,

  ALLOWED_CHANNEL_TRANSITIONS: {
    [ChannelStatus.REGISTERED]: [ChannelStatus.ACTIVE, ChannelStatus.ARCHIVED],
    [ChannelStatus.ACTIVE]: [ChannelStatus.DISABLED, ChannelStatus.ARCHIVED],
    [ChannelStatus.DISABLED]: [ChannelStatus.ACTIVE, ChannelStatus.ARCHIVED],
    [ChannelStatus.ARCHIVED]: [ChannelStatus.ACTIVE], // restore path only
  } as Record<ChannelStatus, ChannelStatus[]>,

  MUTABLE_CHANNEL_STATUSES: new Set<ChannelStatus>([ChannelStatus.REGISTERED]),

  SORT_FIELDS: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    priority: 'priority',
    name: 'name',
    channelKey: 'channelKey',
  } as Record<string, string>,
} as const;

export const MULTI_CHANNEL_ERROR_CODES = {
  CHANNEL_NOT_FOUND: 'MULTI_CHANNEL_NOT_FOUND',
  CHANNEL_DUPLICATE_KEY: 'MULTI_CHANNEL_DUPLICATE_KEY',
  INVALID_CHANNEL: 'MULTI_CHANNEL_INVALID_CHANNEL',
  INVALID_TRANSITION: 'MULTI_CHANNEL_INVALID_TRANSITION',
  DEFAULT_CHANNEL_PROTECTED: 'MULTI_CHANNEL_DEFAULT_PROTECTED',
  CAPABILITY_UNSUPPORTED: 'MULTI_CHANNEL_CAPABILITY_UNSUPPORTED',
  PROVIDER_NOT_REGISTERED: 'MULTI_CHANNEL_PROVIDER_NOT_REGISTERED',
  MAPPING_ALREADY_EXISTS: 'MULTI_CHANNEL_MAPPING_ALREADY_EXISTS',
  MAPPING_NOT_FOUND: 'MULTI_CHANNEL_MAPPING_NOT_FOUND',
  OPERATION_IN_PROGRESS: 'MULTI_CHANNEL_OPERATION_IN_PROGRESS',
} as const;

export const MULTI_CHANNEL_EVENT_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_MS: 3_000,
  REMOVE_ON_COMPLETE: 50,
  REMOVE_ON_FAIL: 100,
} as const;

export const MULTI_CHANNEL_MODULE = 'multi-channel';
