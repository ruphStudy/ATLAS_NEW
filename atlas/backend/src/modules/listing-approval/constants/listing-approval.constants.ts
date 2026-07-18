import { ApprovalCheckArea, ApprovalRule, ApprovalStatus } from '../interfaces';

export const LISTING_APPROVAL_CONSTANTS = {
  DEFAULT_APPROVAL_RULES: [
    { area: ApprovalCheckArea.PRODUCT_INFORMATION, required: true,  description: 'Title, brand and category must be present' },
    { area: ApprovalCheckArea.IMAGES,              required: true,  description: 'At least one approved image required' },
    { area: ApprovalCheckArea.AI_DESCRIPTION,      required: true,  description: 'AI-generated description must be present' },
    { area: ApprovalCheckArea.SEO,                 required: false, description: 'SEO keywords and search terms recommended' },
    { area: ApprovalCheckArea.PRICING,             required: true,  description: 'Selling price must be set' },
    { area: ApprovalCheckArea.CATEGORY,            required: true,  description: 'Category must be assigned' },
    { area: ApprovalCheckArea.ATTRIBUTES,          required: false, description: 'Key product attributes recommended' },
    { area: ApprovalCheckArea.VARIANTS,            required: false, description: 'Variants should be defined if applicable' },
    { area: ApprovalCheckArea.MARKETPLACE_REQUIREMENTS, required: true, description: 'All mandatory marketplace fields must pass' },
  ] as ApprovalRule[],

  ALLOWED_TRANSITIONS: {
    [ApprovalStatus.PENDING_APPROVAL]: [
      ApprovalStatus.APPROVED,
      ApprovalStatus.REJECTED,
      ApprovalStatus.REVISION_REQUIRED,
    ],
    [ApprovalStatus.APPROVED]: [ApprovalStatus.READY_TO_PUBLISH],
    [ApprovalStatus.REJECTED]: [ApprovalStatus.PENDING_APPROVAL],
    [ApprovalStatus.REVISION_REQUIRED]: [ApprovalStatus.PENDING_APPROVAL],
    [ApprovalStatus.READY_TO_PUBLISH]: [],
  } as Record<ApprovalStatus, ApprovalStatus[]>,
} as const;

export const LISTING_APPROVAL_NOTIFICATION_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 5_000,
  REMOVE_ON_COMPLETE_COUNT: 50,
  REMOVE_ON_FAIL_COUNT: 20,
} as const;

export const LISTING_APPROVAL_EVENT_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 5_000,
  REMOVE_ON_COMPLETE_COUNT: 50,
  REMOVE_ON_FAIL_COUNT: 20,
} as const;

export const LISTING_APPROVAL_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  status: 'status',
  reviewedAt: 'reviewedAt',
  version: 'version',
};
