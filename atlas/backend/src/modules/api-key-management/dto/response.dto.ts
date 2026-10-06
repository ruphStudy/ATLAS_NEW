import { ApiKeyScopeType, ApiKeyStatus } from '../interfaces';

/** Never includes `secretHash` or the plaintext secret — safe metadata only. */
export class ApiKeyResponseDto {
  id!: string;
  workspaceId!: string | null;
  organizationId!: string | null;
  scopeType!: ApiKeyScopeType;
  name!: string;
  description!: string | null;
  ownerUserId!: string | null;
  serviceAccountHandle!: string | null;
  keyId!: string;
  status!: ApiKeyStatus;
  scopes!: string[];
  permissions!: string[];
  environments!: string[];
  ipAllowlist!: string[];
  rateLimitPerMinute!: number | null;
  expiresAt!: Date | null;
  lastUsedAt!: Date | null;
  usageCount!: number;
  lastUsedIp!: string | null;
  rotatedFromId!: string | null;
  rotatedToId!: string | null;
  gracePeriodEndsAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedApiKeyResponseDto {
  data!: ApiKeyResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

/** Returned once — the only response shape that ever carries the plaintext key. */
export class ApiKeyCreatedResponseDto {
  apiKey!: ApiKeyResponseDto;
  plaintextKey!: string;
}

export class ApiKeyHistoryResponseDto {
  id!: string;
  apiKeyId!: string;
  changeType!: string;
  fromStatus!: ApiKeyStatus | null;
  toStatus!: ApiKeyStatus | null;
  reason!: string | null;
  changedBy!: string | null;
  createdAt!: Date;
}

export class ApiKeyValidationResponseDto {
  valid!: boolean;
  reason?: string;
  workspaceId?: string;
  organizationId?: string;
}
