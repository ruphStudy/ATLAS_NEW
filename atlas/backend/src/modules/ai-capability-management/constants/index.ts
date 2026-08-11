import { CapabilityDefinitionStatus } from '../interfaces';

export const AI_CAPABILITY_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  DEFINITION_CACHE_TTL_MS: 300_000,
  RESOLUTION_CACHE_TTL_MS: 60_000,
  CACHE_MAX_ENTRIES: 2_000,

  MAX_DEPENDENCY_DEPTH: 5,

  ALLOWED_TRANSITIONS: {
    [CapabilityDefinitionStatus.DRAFT]: [
      CapabilityDefinitionStatus.ACTIVE,
      CapabilityDefinitionStatus.DISABLED,
    ],
    [CapabilityDefinitionStatus.ACTIVE]: [
      CapabilityDefinitionStatus.DEPRECATED,
      CapabilityDefinitionStatus.DISABLED,
    ],
    [CapabilityDefinitionStatus.DEPRECATED]: [
      CapabilityDefinitionStatus.ACTIVE,
      CapabilityDefinitionStatus.DISABLED,
    ],
    [CapabilityDefinitionStatus.DISABLED]: [CapabilityDefinitionStatus.ACTIVE],
  } as Record<CapabilityDefinitionStatus, CapabilityDefinitionStatus[]>,

  SORT_FIELDS: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    capabilityKey: 'capabilityKey',
    status: 'status',
    version: 'version',
  } as Record<string, string>,
} as const;
