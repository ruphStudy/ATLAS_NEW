import { LicenseScopeType, LicenseStatus, LicenseType } from '../interfaces';

/** Never includes `encryptedPrivateKey` — safe metadata only. `publicKey` IS included since it is not secret. */
export class LicenseResponseDto {
  id: string;
  workspaceId: string | null;
  organizationId: string | null;
  scopeType: LicenseScopeType;
  scopeKey: string;
  ownerUserId: string | null;
  environment: string | null;
  deploymentId: string | null;
  type: LicenseType;
  status: LicenseStatus;
  planKey: string;
  subscriptionId: string | null;
  entitlementsSnapshotAt: Date | null;
  featureFlagKeys: string[];
  licenseKeyId: string;
  publicKey: string;
  maxActivations: number | null;
  activationCount: number;
  issuedAt: Date | null;
  activatedAt: Date | null;
  expiresAt: Date | null;
  gracePeriodDays: number;
  gracePeriodEndsAt: Date | null;
  lastValidatedAt: Date | null;
  lastValidationResult: string | null;
  externalReference: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedLicenseResponseDto {
  data: LicenseResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Returned once at issue/rotation time — the only response shape carrying the signed offline token. */
export class LicenseIssuedTokenResponseDto {
  license: LicenseResponseDto;
  token: string;
  publicKey: string;
}

export class LicenseHistoryResponseDto {
  id: string;
  licenseId: string;
  changeType: string;
  fromStatus: LicenseStatus | null;
  toStatus: LicenseStatus | null;
  reason: string | null;
  changedBy: string | null;
  createdAt: Date;
}

export class LicenseValidationResponseDto {
  valid: boolean;
  reason?: string;
}

export class LicenseOfflineVerificationResponseDto {
  valid: boolean;
  reason?: string;
}
