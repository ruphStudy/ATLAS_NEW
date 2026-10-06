import { SsoConnectionStatus, SsoEnforcementPolicy, SsoProtocol, SsoScopeType } from '../interfaces';

/** Never includes `encryptedCertificate`/`encryptedClientSecret` — safe metadata only. */
export class SsoConnectionResponseDto {
  id!: string;
  workspaceId!: string | null;
  organizationId!: string | null;
  scopeType!: SsoScopeType;
  name!: string;
  description!: string | null;
  protocol!: SsoProtocol;
  status!: SsoConnectionStatus;
  enforcementPolicy!: SsoEnforcementPolicy;
  domains!: string[];
  scopes!: string[];
  issuer!: string | null;
  entityId!: string | null;
  clientId!: string | null;
  metadataUrl!: string | null;
  metadataFetchedAt!: Date | null;
  ssoUrl!: string | null;
  sloUrl!: string | null;
  authorizationEndpoint!: string | null;
  tokenEndpoint!: string | null;
  jwksUri!: string | null;
  userInfoEndpoint!: string | null;
  endSessionEndpoint!: string | null;
  jitProvisioningEnabled!: boolean;
  groupClaimName!: string | null;
  defaultRoleId!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedSsoConnectionResponseDto {
  data!: SsoConnectionResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class SsoHistoryResponseDto {
  id!: string;
  connectionId!: string;
  changeType!: string;
  fromStatus!: string | null;
  toStatus!: string | null;
  reason!: string | null;
  changedBy!: string | null;
  createdAt!: Date;
}

export class GroupRoleMappingResponseDto {
  id!: string;
  connectionId!: string;
  externalGroup!: string;
  roleId!: string;
  priority!: number;
  createdAt!: Date;
  updatedAt!: Date;
}

export class SsoInitiateLoginResponseDto {
  redirectUrl!: string;
  state!: string;
  expiresAt!: Date;
}

/** The only response shape carrying ATLAS session tokens — mirrors `AuthResponseDto` from Authentication. */
export class SsoLoginResponseDto {
  accessToken!: string;
  refreshToken!: string;
  userId!: string;
  workspaceId!: string;
  isNewIdentity!: boolean;
}

export class SsoLogoutResponseDto {
  idpLogoutUrl?: string;
}
