import { PublicationStatus, PublicationMarketplace, PublishTrigger } from '../interfaces';

export const LISTING_PUBLISHER_CONSTANTS = {
  MAX_RETRY_COUNT: 3,

  ALLOWED_TRANSITIONS: {
    [PublicationStatus.PENDING]: [PublicationStatus.PUBLISHING, PublicationStatus.ARCHIVED],
    [PublicationStatus.PUBLISHING]: [PublicationStatus.PUBLISHED, PublicationStatus.FAILED],
    [PublicationStatus.PUBLISHED]: [PublicationStatus.UNPUBLISHED, PublicationStatus.PUBLISHING],
    [PublicationStatus.FAILED]: [PublicationStatus.PUBLISHING, PublicationStatus.ARCHIVED],
    [PublicationStatus.UNPUBLISHED]: [PublicationStatus.PUBLISHING, PublicationStatus.ARCHIVED],
    [PublicationStatus.ARCHIVED]: [],
  } as Record<PublicationStatus, PublicationStatus[]>,

  MARKETPLACE_ADAPTER_TIMEOUT_MS: {
    [PublicationMarketplace.AMAZON]: 30_000,
    [PublicationMarketplace.EBAY]: 20_000,
    [PublicationMarketplace.SHOPIFY]: 15_000,
    [PublicationMarketplace.WALMART]: 30_000,
    [PublicationMarketplace.ETSY]: 15_000,
    [PublicationMarketplace.CUSTOM]: 15_000,
  } as Record<PublicationMarketplace, number>,

  RETRYABLE_TRIGGERS: [PublishTrigger.RETRY, PublishTrigger.REPUBLISH] as PublishTrigger[],
} as const;

export const PUBLISH_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 15_000,
  REMOVE_ON_COMPLETE_COUNT: 30,
  REMOVE_ON_FAIL_COUNT: 50,
} as const;

export const PUBLICATION_EVENT_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 5_000,
  REMOVE_ON_COMPLETE_COUNT: 50,
  REMOVE_ON_FAIL_COUNT: 20,
} as const;

export const BULK_PUBLISH_QUEUE_CONFIG = {
  ATTEMPTS: 2,
  BACKOFF_DELAY_MS: 10_000,
  REMOVE_ON_COMPLETE_COUNT: 20,
  REMOVE_ON_FAIL_COUNT: 30,
} as const;

export const LISTING_PUBLISHER_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  status: 'status',
  publishedAt: 'publishedAt',
  marketplace: 'marketplace',
  publicationVersion: 'publicationVersion',
  retryCount: 'retryCount',
};
