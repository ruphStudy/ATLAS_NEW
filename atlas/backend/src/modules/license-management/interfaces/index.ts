export enum LicenseScopeType {
  ORGANIZATION = 'ORGANIZATION',
  WORKSPACE = 'WORKSPACE',
  USER = 'USER',
  ENVIRONMENT = 'ENVIRONMENT',
  DEPLOYMENT = 'DEPLOYMENT',
}

export enum LicenseType {
  TRIAL = 'TRIAL',
  STANDARD = 'STANDARD',
  ENTERPRISE = 'ENTERPRISE',
  CUSTOM = 'CUSTOM',
  INTERNAL = 'INTERNAL',
}

export enum LicenseStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

export enum LicenseChangeType {
  CREATED = 'CREATED',
  ISSUED = 'ISSUED',
  ACTIVATED = 'ACTIVATED',
  SUSPENDED = 'SUSPENDED',
  REACTIVATED = 'REACTIVATED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
  RENEWED = 'RENEWED',
  TRANSFERRED = 'TRANSFERRED',
  KEY_ROTATED = 'KEY_ROTATED',
  ENTITLEMENTS_REFRESHED = 'ENTITLEMENTS_REFRESHED',
}

export enum LicenseManagementEvent {
  LICENSE_CREATED = 'license-management.license_created',
  LICENSE_ISSUED = 'license-management.license_issued',
  LICENSE_ACTIVATED = 'license-management.license_activated',
  LICENSE_SUSPENDED = 'license-management.license_suspended',
  LICENSE_REACTIVATED = 'license-management.license_reactivated',
  LICENSE_REVOKED = 'license-management.license_revoked',
  LICENSE_EXPIRED = 'license-management.license_expired',
  LICENSE_RENEWED = 'license-management.license_renewed',
  LICENSE_TRANSFERRED = 'license-management.license_transferred',
  LICENSE_KEY_ROTATED = 'license-management.license_key_rotated',
  LICENSE_ENTITLEMENTS_REFRESHED = 'license-management.license_entitlements_refreshed',
  LICENSE_VALIDATED = 'license-management.license_validated',
  LICENSE_VALIDATION_FAILED = 'license-management.license_validation_failed',
}

export interface ILicense {
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
  entitlementsSnapshot: unknown;
  entitlementsSnapshotAt: Date | null;
  featureFlagKeys: string[];
  licenseKeyId: string;
  encryptedPrivateKey: string;
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
  suspendedAt: Date | null;
  suspendedReason: string | null;
  revokedAt: Date | null;
  revokedReason: string | null;
  externalReference: string | null;
  version: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILicenseHistory {
  id: string;
  licenseId: string;
  workspaceId: string | null;
  changeType: LicenseChangeType;
  fromStatus: LicenseStatus | null;
  toStatus: LicenseStatus | null;
  reason: string | null;
  changedBy: string | null;
  snapshot: unknown;
  createdAt: Date;
}

/** Returned once at issue/rotation time — the only response shape carrying the signed offline token and the public verification key (never the private key). */
export interface ILicenseIssuedToken {
  license: ILicense;
  token: string;
  publicKey: string;
}

export interface ILicenseValidationContext {
  workspaceId?: string;
  organizationId?: string;
  userId?: string;
  environment?: string;
  deploymentId?: string;
}

export interface ILicenseValidationResult {
  valid: boolean;
  reason?: string;
  license?: ILicense;
}

export interface ILicenseOfflineVerificationResult {
  valid: boolean;
  reason?: string;
  payload?: ILicenseTokenPayload;
}

export interface ILicenseTokenPayload {
  licenseKeyId: string;
  scopeKey: string;
  planKey: string;
  type: LicenseType;
  entitlementKeys: string[];
  featureFlagKeys: string[];
  issuedAt: number;
  expiresAt: number | null;
}

export interface ILicenseManagementEventPayload {
  event: LicenseManagementEvent;
  licenseId: string;
  workspaceId?: string | null;
  scopeKey?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
