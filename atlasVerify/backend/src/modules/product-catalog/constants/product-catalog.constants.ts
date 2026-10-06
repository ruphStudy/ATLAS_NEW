import { CatalogStatus } from '../interfaces';

export const CATALOG_CONSTANTS = {
  SKU_PREFIX: 'CAT',
  SKU_PAD_LENGTH: 7,
  INITIAL_VERSION: 1,

  EVENTS: {
    CREATED: 'product-catalog.created',
    UPDATED: 'product-catalog.updated',
    APPROVED: 'product-catalog.approved',
    ARCHIVED: 'product-catalog.archived',
  },

  ALLOWED_TRANSITIONS: {
    [CatalogStatus.DRAFT]: [
      CatalogStatus.READY_FOR_AI,
      CatalogStatus.READY_FOR_APPROVAL,
    ],
    [CatalogStatus.READY_FOR_AI]: [
      CatalogStatus.AI_GENERATED,
      CatalogStatus.DRAFT,
    ],
    [CatalogStatus.AI_GENERATED]: [
      CatalogStatus.READY_FOR_APPROVAL,
      CatalogStatus.DRAFT,
    ],
    [CatalogStatus.READY_FOR_APPROVAL]: [
      CatalogStatus.APPROVED,
      CatalogStatus.DRAFT,
    ],
    [CatalogStatus.APPROVED]: [
      CatalogStatus.PUBLISHED,
      CatalogStatus.ARCHIVED,
    ],
    [CatalogStatus.PUBLISHED]: [CatalogStatus.ARCHIVED],
    [CatalogStatus.ARCHIVED]: [],
  } as Record<CatalogStatus, CatalogStatus[]>,
} as const;

export const CATALOG_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 5_000,
  REMOVE_ON_COMPLETE_COUNT: 50,
  REMOVE_ON_FAIL_COUNT: 20,
} as const;

export const CATALOG_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  productName: 'productName',
  catalogSku: 'catalogSku',
  brand: 'brand',
  status: 'status',
  purchaseCost: 'purchaseCost',
  landedCost: 'landedCost',
  suggestedSellingPrice: 'suggestedSellingPrice',
  version: 'version',
};
